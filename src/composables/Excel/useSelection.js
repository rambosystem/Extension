import { ref, computed } from "vue";

/**
 * Excel 选择逻辑 Composable
 *
 * 用于通用组件 Excel 的内部状态管理
 *
 * 设计原则：
 * - 通用组件（Components/Common/）应该自包含，不依赖 Store
 * - 每个组件实例拥有独立的选择状态，保证组件的可复用性
 * - 这是通用组件的标准做法，符合组件化设计原则
 *
 * 模式说明：
 * - SINGLE 模式：普通选择（点击、拖选），只有一个选区
 * - MULTIPLE 模式：Ctrl+选择（点击、拖选），可以有多个选区
 *
 * 模式切换规则：
 * 1. 两种模式完全独立，互不干扰
 * 2. 从 MULTIPLE 模式切换到 SINGLE 模式时，清空多选列表（multiSelections）
 * 3. 从 SINGLE 模式切换到 MULTIPLE 模式时，保留之前 SINGLE 模式的选区（加入 multiSelections）
 *
 * 选择状态记录：
 * - SINGLE 模式：使用 selectionStart 和 selectionEnd（通过 normalizedSelection 计算）
 * - MULTIPLE 模式：使用 multiSelections 数组
 * - 两种模式通过 isInSelection 函数统一检查，使用同一个"矩阵"记录选择状态
 */
export function useSelection() {
  const activeCell = ref(null); // { row, col }
  const selectionStart = ref(null);
  const selectionEnd = ref(null);
  const isSelecting = ref(false);
  const multiSelections = ref([]); // 存储多个独立选区 [{ minRow, maxRow, minCol, maxCol }, ...]
  const isMultipleMode = ref(false); // 当前选择模式：true = MULTIPLE 模式，false = SINGLE 模式

  // 计算归一化后的选区（始终确保 min <= max）
  const normalizedSelection = computed(() => {
    if (!selectionStart.value || !selectionEnd.value) return null;
    return {
      minRow: Math.min(selectionStart.value.row, selectionEnd.value.row),
      maxRow: Math.max(selectionStart.value.row, selectionEnd.value.row),
      minCol: Math.min(selectionStart.value.col, selectionEnd.value.col),
      maxCol: Math.max(selectionStart.value.col, selectionEnd.value.col),
    };
  });

  /**
   * 判断单元格是否在选区范围内
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @param {Object} range - 选区范围 { minRow, maxRow, minCol, maxCol }
   * @returns {boolean}
   */
  const isCellInRange = (row, col, range) => {
    return (
      row >= range.minRow &&
      row <= range.maxRow &&
      col >= range.minCol &&
      col <= range.maxCol
    );
  };

  // ==================== SINGLE 模式：普通选择 ====================

  /**
   * SINGLE 模式：开始选择（点击）
   *
   * 行为说明：
   * - 从 MULTIPLE 模式切换到 SINGLE 模式时，清空多选列表
   * - 设置新的单一选区
   *
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   */
  const startSingleSelection = (row, col) => {
    // 切换到 SINGLE 模式
    isMultipleMode.value = false;

    // 清除多选列表（从 MULTIPLE 模式切换到 SINGLE 模式）
    multiSelections.value = [];

    // 设置新的单一选区
    const newPos = { row, col };
    activeCell.value = newPos;
    selectionStart.value = newPos;
    selectionEnd.value = newPos;
  };

  /**
   * SINGLE 模式：更新选择终点（拖选）
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   */
  const updateSingleSelectionEnd = (row, col) => {
    selectionEnd.value = { row, col };
  };

  // ==================== MULTIPLE 模式：Ctrl+选择 ====================

  /**
   * MULTIPLE 模式：开始选择（Ctrl+点击）
   *
   * 行为说明：
   * - 从 SINGLE 模式切换到 MULTIPLE 模式时，保留之前 SINGLE 模式的选区（加入多选列表）
   * - 如果当前选区不在多选列表中，先将其加入多选列表
   * - 然后添加新的单格选区
   *
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @returns {Object|null} 如果单元格已在多选列表中，返回包含选区索引的对象，否则返回 null
   */
  const startMultipleSelection = (row, col) => {
    // 切换到 MULTIPLE 模式
    isMultipleMode.value = true;

    // 检查这个单元格是否已经在多选列表中
    const containingSelectionIndex = multiSelections.value.findIndex((sel) =>
      isCellInRange(row, col, sel)
    );

    if (containingSelectionIndex >= 0) {
      // 如果已经在多选列表中，设置为拖选起点（不立即取消，等 mouseUp 时处理）
      const newPos = { row, col };
      activeCell.value = newPos;
      selectionStart.value = newPos;
      selectionEnd.value = newPos;
      // 返回选区索引，供 mouseUp 时使用
      return { containingSelectionIndex };
    }

    // 如果不在多选列表中，准备添加新选区
    // 重要：如果当前选区存在（SINGLE 模式的选区），但不在多选列表中，先把当前选区加入多选列表
    // 这样可以保留从 SINGLE 模式切换到 MULTIPLE 模式时的选区
    const currentSelection = normalizedSelection.value;
    if (currentSelection) {
      const currentIndex = multiSelections.value.findIndex(
        (sel) =>
          sel.minRow === currentSelection.minRow &&
          sel.maxRow === currentSelection.maxRow &&
          sel.minCol === currentSelection.minCol &&
          sel.maxCol === currentSelection.maxCol
      );
      if (currentIndex < 0) {
        // 保留之前 SINGLE 模式的选区
        multiSelections.value.push({ ...currentSelection });
      }
    }

    // 优化：不在 mousedown 时立即 push 单格选区到 multiSelections
    // 而是只设置 selectionStart/End，让拖拽过程能够实时显示
    // 最终的选区将在 mouseup 时通过 endMultipleSelectionClick 或 endMultipleSelectionDrag 添加到 multiSelections
    const newPos = { row, col };
    activeCell.value = newPos;
    selectionStart.value = newPos;
    selectionEnd.value = newPos;
    return null;
  };

  /**
   * MULTIPLE 模式：更新选择终点（Ctrl+拖选）
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   */
  const updateMultipleSelectionEnd = (row, col) => {
    selectionEnd.value = { row, col };
  };

  /**
   * 将大选区拆分成多个单格选区
   * @param {Object} selection - 原选区 { minRow, maxRow, minCol, maxCol }
   * @param {number} excludeRow - 要排除的行索引（可选）
   * @param {number} excludeCol - 要排除的列索引（可选）
   * @returns {Array} 拆分后的单格选区数组
   */
  const splitSelectionIntoCells = (
    selection,
    excludeRow = null,
    excludeCol = null
  ) => {
    const { minRow, maxRow, minCol, maxCol } = selection;
    const cells = [];

    // 遍历选区中的每个单元格
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        // 如果指定了要排除的单元格，跳过它
        if (
          excludeRow !== null &&
          excludeCol !== null &&
          r === excludeRow &&
          c === excludeCol
        ) {
          continue;
        }
        // 添加单格选区
        cells.push({
          minRow: r,
          maxRow: r,
          minCol: c,
          maxCol: c,
        });
      }
    }

    return cells;
  };

  /**
   * 矩阵切割算法：将多个选区（特别是单格选区）合并成尽可能大的矩形选区
   *
   * 算法思路：
   * 1. 收集所有选区中的所有单元格
   * 2. 使用贪心算法将相邻单元格合并成矩形选区
   * 3. 优先合并行，然后合并列
   *
   * @param {Array} selections - 选区数组 [{ minRow, maxRow, minCol, maxCol }, ...]
   * @returns {Array} 优化后的选区数组
   */
  const optimizeSelections = (selections) => {
    if (!selections || selections.length === 0) {
      return [];
    }

    // 1. 收集所有单元格（去重）
    const cellSet = new Set();
    selections.forEach((sel) => {
      for (let r = sel.minRow; r <= sel.maxRow; r++) {
        for (let c = sel.minCol; c <= sel.maxCol; c++) {
          cellSet.add(`${r},${c}`);
        }
      }
    });

    if (cellSet.size === 0) {
      return [];
    }

    // 2. 将单元格转换为坐标数组并排序
    const cells = Array.from(cellSet)
      .map((key) => {
        const [row, col] = key.split(",").map(Number);
        return { row, col };
      })
      .sort((a, b) => {
        // 先按行排序，再按列排序
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
      });

    // 3. 使用贪心算法合并单元格成矩形
    const optimized = [];
    const used = new Set();

    for (let i = 0; i < cells.length; i++) {
      if (used.has(`${cells[i].row},${cells[i].col}`)) {
        continue;
      }

      // 从当前单元格开始，尝试扩展成尽可能大的矩形
      let minRow = cells[i].row;
      let maxRow = cells[i].row;
      let minCol = cells[i].col;
      let maxCol = cells[i].col;

      // 尝试向下扩展行
      let canExpandRow = true;
      while (canExpandRow) {
        const nextRow = maxRow + 1;
        let rowComplete = true;

        // 检查下一行的所有列是否都存在且未被使用
        for (let c = minCol; c <= maxCol; c++) {
          const key = `${nextRow},${c}`;
          if (!cellSet.has(key) || used.has(key)) {
            rowComplete = false;
            break;
          }
        }

        if (rowComplete) {
          maxRow = nextRow;
        } else {
          canExpandRow = false;
        }
      }

      // 尝试向右扩展列
      let canExpandCol = true;
      while (canExpandCol) {
        const nextCol = maxCol + 1;
        let colComplete = true;

        // 检查下一列的所有行是否都存在且未被使用
        for (let r = minRow; r <= maxRow; r++) {
          const key = `${r},${nextCol}`;
          if (!cellSet.has(key) || used.has(key)) {
            colComplete = false;
            break;
          }
        }

        if (colComplete) {
          maxCol = nextCol;
        } else {
          canExpandCol = false;
        }
      }

      // 标记这个矩形内的所有单元格为已使用
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          used.add(`${r},${c}`);
        }
      }

      // 添加优化后的矩形选区
      optimized.push({
        minRow,
        maxRow,
        minCol,
        maxCol,
      });
    }

    return optimized;
  };

  /**
   * MULTIPLE 模式：结束选择（Ctrl+单击）
   *
   * 行为说明：
   * - 如果单元格已在多选列表中，将其拆分成单格选区，然后移除该单元格
   * - 如果单元格不在多选列表中，添加该单元格为单格选区
   *
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   */
  const endMultipleSelectionClick = (row, col) => {
    // 检查这个单元格是否已经在多选列表中
    const containingSelectionIndex = multiSelections.value.findIndex((sel) =>
      isCellInRange(row, col, sel)
    );

    if (containingSelectionIndex >= 0) {
      // 1. 如果已经在多选列表中，将该选区拆分成单格选区，然后移除该单元格
      const containingSelection =
        multiSelections.value[containingSelectionIndex];

      // 如果该选区是单格选区，直接移除
      if (
        containingSelection.minRow === containingSelection.maxRow &&
        containingSelection.minCol === containingSelection.maxCol
      ) {
        multiSelections.value.splice(containingSelectionIndex, 1);
      } else {
        // 将大选区拆分成多个单格选区（排除目标单元格）
        const newCells = splitSelectionIntoCells(containingSelection, row, col);

        // 移除原选区
        multiSelections.value.splice(containingSelectionIndex, 1);

        // 添加拆分后的单格选区
        newCells.forEach((cell) => {
          multiSelections.value.push(cell);
        });

        // 优化选区：将单格选区合并成矩形选区
        multiSelections.value = optimizeSelections(multiSelections.value);
      }

      // 更新 activeCell：优先尝试找到包含用户点击位置附近单元格的选区
      // 如果找不到，使用最后一个选区
      if (multiSelections.value.length > 0) {
        // 尝试找到包含用户点击位置附近单元格的选区（优先使用相邻单元格）
        let targetSelection = null;

        // 检查点击位置的上、下、左、右相邻单元格是否在某个选区内
        const adjacentCells = [
          { row: row - 1, col }, // 上
          { row: row + 1, col }, // 下
          { row, col: col - 1 }, // 左
          { row, col: col + 1 }, // 右
        ];

        for (const cell of adjacentCells) {
          const found = multiSelections.value.find((sel) =>
            isCellInRange(cell.row, cell.col, sel)
          );
          if (found) {
            targetSelection = found;
            // 使用相邻单元格作为 activeCell
            activeCell.value = { row: cell.row, col: cell.col };
            selectionStart.value = { row: cell.row, col: cell.col };
            selectionEnd.value = { row: found.maxRow, col: found.maxCol };
            break;
          }
        }

        // 如果没找到相邻单元格，使用最后一个选区
        if (!targetSelection) {
          const last = multiSelections.value[multiSelections.value.length - 1];
          activeCell.value = { row: last.minRow, col: last.minCol };
          selectionStart.value = { row: last.minRow, col: last.minCol };
          selectionEnd.value = { row: last.maxRow, col: last.maxCol };
        }
      } else {
        // 多选列表为空，切换到 SINGLE 模式
        isMultipleMode.value = false;
        activeCell.value = null;
        selectionStart.value = null;
        selectionEnd.value = null;
      }
    } else {
      // 2. 如果不在列表中，则添加该单元格为单格选区
      const newSelection = {
        minRow: row,
        maxRow: row,
        minCol: col,
        maxCol: col,
      };
      multiSelections.value.push(newSelection);

      // 优化选区：尝试将新添加的单元格与相邻选区合并
      multiSelections.value = optimizeSelections(multiSelections.value);

      // 确保活动单元格状态正确
      activeCell.value = { row, col };
      selectionStart.value = { row, col };
      selectionEnd.value = { row, col };
    }
  };

  /**
   * 从选区中移除拖选范围内的所有单元格
   * @param {Object} selection - 原选区 { minRow, maxRow, minCol, maxCol }
   * @param {Object} dragRange - 拖选范围 { minRow, maxRow, minCol, maxCol }
   * @returns {Array} 移除后的剩余选区数组
   */
  const removeDragRangeFromSelection = (selection, dragRange) => {
    const { minRow, maxRow, minCol, maxCol } = selection;
    const {
      minRow: dragMinRow,
      maxRow: dragMaxRow,
      minCol: dragMinCol,
      maxCol: dragMaxCol,
    } = dragRange;
    const remainingCells = [];

    // 遍历选区中的每个单元格
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        // 如果单元格不在拖选范围内，保留它
        if (
          r < dragMinRow ||
          r > dragMaxRow ||
          c < dragMinCol ||
          c > dragMaxCol
        ) {
          remainingCells.push({
            minRow: r,
            maxRow: r,
            minCol: c,
            maxCol: c,
          });
        }
        // 否则，该单元格在拖选范围内，被移除（不添加到 remainingCells）
      }
    }

    return remainingCells;
  };

  /**
   * MULTIPLE 模式：结束选择（Ctrl+拖选）
   *
   * Excel 逻辑：
   * - 如果从已选中的单元格开始拖拽，应该取消拖选范围内的单元格（移除）
   * - 如果从未选中的单元格开始拖拽，直接添加新选区
   * - Ctrl 拖选从已选中单元格开始 = 取消选择，从未选中单元格开始 = 添加选择
   *
   * @param {Object} options - 选项
   * @param {Object} options.removeSingleCell - 要移除的单个单元格 { row, col }（可选）
   * @param {number} options.removeSelectionIndex - 要移除的选区索引（可选，用于处理从已选中单元格拖拽的情况）
   * @param {boolean} options.isCancelMode - 是否为取消模式（从已选中单元格开始拖拽）
   * @returns {boolean} 是否成功处理（true=处理成功，false=处理失败）
   */
  const endMultipleSelectionDrag = (options = {}) => {
    const selection = normalizedSelection.value;
    if (!selection) return false;

    const { removeSingleCell, removeSelectionIndex, isCancelMode } = options;

    // 如果是从已选中的单元格开始拖拽（取消模式）
    if (
      isCancelMode &&
      removeSelectionIndex !== undefined &&
      removeSelectionIndex >= 0
    ) {
      const originalSelection = multiSelections.value[removeSelectionIndex];

      // 将原选区拆分成单格选区，然后移除拖选范围内的单元格
      const remainingCells = removeDragRangeFromSelection(
        originalSelection,
        selection
      );

      // 移除原选区
      multiSelections.value.splice(removeSelectionIndex, 1);

      // 添加剩余的单元格（作为单格选区）
      remainingCells.forEach((cell) => {
        multiSelections.value.push(cell);
      });

      // 优化选区：将单格选区合并成矩形选区
      multiSelections.value = optimizeSelections(multiSelections.value);

      // 更新 activeCell：优先尝试找到包含起始单元格附近单元格的选区
      // 如果找不到，使用最后一个选区
      if (multiSelections.value.length > 0) {
        // 获取起始单元格位置（用户开始拖拽的位置）
        const startRow = selectionStart.value?.row;
        const startCol = selectionStart.value?.col;

        // 尝试找到包含起始单元格附近单元格的选区
        let targetSelection = null;

        if (startRow !== undefined && startCol !== undefined) {
          // 首先检查起始单元格是否还在某个选区内
          targetSelection = multiSelections.value.find((sel) =>
            isCellInRange(startRow, startCol, sel)
          );

          if (targetSelection) {
            // 如果起始单元格还在选区内，使用起始单元格位置
            activeCell.value = { row: startRow, col: startCol };
            selectionStart.value = { row: startRow, col: startCol };
            selectionEnd.value = {
              row: targetSelection.maxRow,
              col: targetSelection.maxCol,
            };
          } else {
            // 如果起始单元格不在选区内，检查相邻单元格
            const adjacentCells = [
              { row: startRow - 1, col: startCol }, // 上
              { row: startRow + 1, col: startCol }, // 下
              { row: startRow, col: startCol - 1 }, // 左
              { row: startRow, col: startCol + 1 }, // 右
            ];

            for (const cell of adjacentCells) {
              const found = multiSelections.value.find((sel) =>
                isCellInRange(cell.row, cell.col, sel)
              );
              if (found) {
                targetSelection = found;
                activeCell.value = { row: cell.row, col: cell.col };
                selectionStart.value = { row: cell.row, col: cell.col };
                selectionEnd.value = { row: found.maxRow, col: found.maxCol };
                break;
              }
            }
          }
        }

        // 如果没找到，使用最后一个选区
        if (!targetSelection) {
          const last = multiSelections.value[multiSelections.value.length - 1];
          activeCell.value = { row: last.minRow, col: last.minCol };
          selectionStart.value = { row: last.minRow, col: last.minCol };
          selectionEnd.value = { row: last.maxRow, col: last.maxCol };
        }
      } else {
        // 多选列表为空，切换到 SINGLE 模式
        isMultipleMode.value = false;
        activeCell.value = null;
        selectionStart.value = null;
        selectionEnd.value = null;
      }

      return true;
    }

    // 如果是从未选中的单元格开始拖拽（添加模式）
    // 如果指定了要移除的单个单元格（处理 startMultipleSelection 留下的单格选区痕迹），先移除它
    if (removeSingleCell) {
      const { row, col } = removeSingleCell;
      const singleCellIndex = multiSelections.value.findIndex(
        (sel) =>
          sel.minRow === row &&
          sel.maxRow === row &&
          sel.minCol === col &&
          sel.maxCol === col
      );
      if (singleCellIndex >= 0) {
        multiSelections.value.splice(singleCellIndex, 1);
      }
    }

    // 添加新选区
    multiSelections.value.push({ ...selection });

    // 优化选区：尝试将新添加的选区与相邻选区合并
    multiSelections.value = optimizeSelections(multiSelections.value);

    // 更新 activeCell：查找包含原选区起始单元格的选区
    // 使用 selectionStart.value 而不是 selection.minRow/minCol，因为用户可能从选区的任意位置开始拖拽
    // 如果找不到（可能被合并了），使用最后一个选区
    const startRow = selectionStart.value?.row;
    const startCol = selectionStart.value?.col;
    const targetSelection =
      startRow !== undefined && startCol !== undefined
        ? multiSelections.value.find((sel) =>
            isCellInRange(startRow, startCol, sel)
          )
        : null;

    if (targetSelection) {
      // 如果找到了包含起始单元格的选区，优先使用起始单元格位置
      // 但如果起始单元格不在任何选区内（可能被优化掉了），使用选区的左上角
      activeCell.value = {
        row: startRow,
        col: startCol,
      };
      selectionStart.value = {
        row: startRow,
        col: startCol,
      };
      selectionEnd.value = {
        row: targetSelection.maxRow,
        col: targetSelection.maxCol,
      };
    } else if (multiSelections.value.length > 0) {
      // 如果找不到，使用最后一个选区
      const last = multiSelections.value[multiSelections.value.length - 1];
      activeCell.value = { row: last.minRow, col: last.minCol };
      selectionStart.value = { row: last.minRow, col: last.minCol };
      selectionEnd.value = { row: last.maxRow, col: last.maxCol };
    }

    return true;
  };

  // ==================== 通用函数 ====================

  const updateSelectionEnd = (row, col) => {
    selectionEnd.value = { row, col };
  };

  const isActive = (row, col) => {
    return activeCell.value?.row === row && activeCell.value?.col === col;
  };

  /**
   * 判断单元格是否在任意选区内（包括当前选区和多选列表）
   *
   * 多选模式下的行为：
   * - 如果存在多选列表，优先检查多选列表（已归档的选区）
   * - 即使存在多选列表，如果正在进行选择（isSelecting），也要检查当前正在拖拽的临时选区（normalizedSelection）
   * - 这样可以确保在拖拽过程中，选区能够实时跟随鼠标
   *
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @returns {boolean}
   */
  const isInSelection = (row, col) => {
    // 1. 检查已归档的多选列表
    if (multiSelections.value && multiSelections.value.length > 0) {
      const inMultiSelection = multiSelections.value.some(
        (sel) =>
          row >= sel.minRow &&
          row <= sel.maxRow &&
          col >= sel.minCol &&
          col <= sel.maxCol
      );
      if (inMultiSelection) {
        return true;
      }
    }

    // 2. 修正：即使在多选模式下，如果正在进行选择（isSelecting），
    // 也要检查当前正在拖拽的临时选区（normalizedSelection）
    // 这样可以确保在拖拽过程中，选区能够实时跟随鼠标，提供视觉反馈
    const range = normalizedSelection.value;
    if (range) {
      if (
        row >= range.minRow &&
        row <= range.maxRow &&
        col >= range.minCol &&
        col <= range.maxCol
      ) {
        return true;
      }
    }

    return false;
  };

  /**
   * 判断单元格是否在多选列表中（但不在当前选区中）
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @returns {boolean}
   */
  const isInMultiSelectionOnly = (row, col) => {
    // 先检查是否在当前选区中
    const range = normalizedSelection.value;
    if (range) {
      if (
        row >= range.minRow &&
        row <= range.maxRow &&
        col >= range.minCol &&
        col <= range.maxCol
      ) {
        return false; // 在当前选区中，不是"仅多选"
      }
    }

    // 检查是否在多选列表中
    return multiSelections.value.some(
      (sel) =>
        row >= sel.minRow &&
        row <= sel.maxRow &&
        col >= sel.minCol &&
        col <= sel.maxCol
    );
  };

  /**
   * 判断单元格是否应该使用多选背景色
   * 当存在多选时，当前选区也应该使用多选背景色
   * @param {number} row - 行索引
   * @param {number} col - 列索引
   * @returns {boolean}
   */
  const shouldUseMultiSelectionStyle = (row, col) => {
    // 如果存在多选，检查是否在任意选区内（包括当前选区）
    if (
      multiSelections &&
      multiSelections.value &&
      multiSelections.value.length > 0
    ) {
      return isInSelection(row, col);
    }
    return false;
  };

  /**
   * 判断表头是否在任意选区内
   * @param {number} index - 行或列索引
   * @param {string} type - 'row' 或 'col'
   * @returns {boolean}
   */
  const isInSelectionHeader = (index, type) => {
    // 检查当前选区
    const range = normalizedSelection.value;
    if (range) {
      const inCurrentSelection =
        type === "row"
          ? index >= range.minRow && index <= range.maxRow
          : index >= range.minCol && index <= range.maxCol;
      if (inCurrentSelection) return true;
    }

    // 检查多选列表
    return multiSelections.value.some((sel) => {
      return type === "row"
        ? index >= sel.minRow && index <= sel.maxRow
        : index >= sel.minCol && index <= sel.maxCol;
    });
  };

  // 移动活动单元格（用于键盘导航）
  const moveActiveCell = (
    rOffset,
    cOffset,
    maxRows,
    maxCols,
    extendSelection = false
  ) => {
    if (!activeCell.value) return;

    const currentRow = extendSelection
      ? selectionEnd.value.row
      : activeCell.value.row;
    const currentCol = extendSelection
      ? selectionEnd.value.col
      : activeCell.value.col;

    const newRow = Math.max(0, Math.min(maxRows - 1, currentRow + rOffset));
    const newCol = Math.max(0, Math.min(maxCols - 1, currentCol + cOffset));
    const newPos = { row: newRow, col: newCol };

    if (extendSelection) {
      // Shift + 方向键：只更新终点
      selectionEnd.value = newPos;
    } else {
      // 普通移动：重置起点和终点
      activeCell.value = newPos;
      selectionStart.value = newPos;
      selectionEnd.value = newPos;
    }
  };

  /**
   * 清除所有多选
   */
  const clearMultiSelections = () => {
    multiSelections.value = [];
  };

  /**
   * 清除所有选择状态（包括 activeCell、selectionStart、selectionEnd）
   * 默认情况下 activeCell 为 null，只有在用户点击单元格时才设置
   */
  const clearSelection = () => {
    activeCell.value = null;
    selectionStart.value = null;
    selectionEnd.value = null;
    multiSelections.value = [];
    isMultipleMode.value = false;
  };

  /**
   * 全选指定行
   * @param {number} rowIndex - 行索引
   * @param {number} maxCols - 最大列数
   * @param {boolean} addToMultiSelect - 是否添加到多选（Ctrl+点击）
   */
  const selectRow = (rowIndex, maxCols, addToMultiSelect = false) => {
    if (addToMultiSelect) {
      // MULTIPLE 模式：添加到多选列表
      isMultipleMode.value = true;
      const newSelection = {
        minRow: rowIndex,
        maxRow: rowIndex,
        minCol: 0,
        maxCol: maxCols - 1,
      };

      // 检查是否已存在相同的行选区
      const existingIndex = multiSelections.value.findIndex(
        (sel) =>
          sel.minRow === newSelection.minRow &&
          sel.maxRow === newSelection.maxRow &&
          sel.minCol === newSelection.minCol &&
          sel.maxCol === newSelection.maxCol
      );

      if (existingIndex >= 0) {
        // 如果已存在，移除它（切换选择）
        multiSelections.value.splice(existingIndex, 1);
        // 更新 activeCell
        if (multiSelections.value.length > 0) {
          const last = multiSelections.value[multiSelections.value.length - 1];
          activeCell.value = { row: last.minRow, col: last.minCol };
          selectionStart.value = { row: last.minRow, col: last.minCol };
          selectionEnd.value = { row: last.maxRow, col: last.maxCol };
        } else {
          isMultipleMode.value = false;
          activeCell.value = null;
          selectionStart.value = null;
          selectionEnd.value = null;
        }
      } else {
        // 如果不存在，添加新选区
        multiSelections.value.push(newSelection);
        // 优化选区
        multiSelections.value = optimizeSelections(multiSelections.value);
        // 更新 activeCell
        activeCell.value = { row: rowIndex, col: 0 };
        selectionStart.value = { row: rowIndex, col: 0 };
        selectionEnd.value = { row: rowIndex, col: maxCols - 1 };
      }
    } else {
      // SINGLE 模式：设置新的单一选区
      isMultipleMode.value = false;
      multiSelections.value = [];
      activeCell.value = { row: rowIndex, col: 0 };
      selectionStart.value = { row: rowIndex, col: 0 };
      selectionEnd.value = { row: rowIndex, col: maxCols - 1 };
    }
  };

  /**
   * 全选指定列
   * @param {number} colIndex - 列索引
   * @param {number} maxRows - 最大行数
   * @param {boolean} addToMultiSelect - 是否添加到多选（Ctrl+点击）
   */
  const selectColumn = (colIndex, maxRows, addToMultiSelect = false) => {
    if (addToMultiSelect) {
      // MULTIPLE 模式：添加到多选列表
      isMultipleMode.value = true;
      const newSelection = {
        minRow: 0,
        maxRow: maxRows - 1,
        minCol: colIndex,
        maxCol: colIndex,
      };

      // 检查是否已存在相同的列选区
      const existingIndex = multiSelections.value.findIndex(
        (sel) =>
          sel.minRow === newSelection.minRow &&
          sel.maxRow === newSelection.maxRow &&
          sel.minCol === newSelection.minCol &&
          sel.maxCol === newSelection.maxCol
      );

      if (existingIndex >= 0) {
        // 如果已存在，移除它（切换选择）
        multiSelections.value.splice(existingIndex, 1);
        // 更新 activeCell
        if (multiSelections.value.length > 0) {
          const last = multiSelections.value[multiSelections.value.length - 1];
          activeCell.value = { row: last.minRow, col: last.minCol };
          selectionStart.value = { row: last.minRow, col: last.minCol };
          selectionEnd.value = { row: last.maxRow, col: last.maxCol };
        } else {
          isMultipleMode.value = false;
          activeCell.value = null;
          selectionStart.value = null;
          selectionEnd.value = null;
        }
      } else {
        // 如果不存在，添加新选区
        multiSelections.value.push(newSelection);
        // 优化选区
        multiSelections.value = optimizeSelections(multiSelections.value);
        // 更新 activeCell
        activeCell.value = { row: 0, col: colIndex };
        selectionStart.value = { row: 0, col: colIndex };
        selectionEnd.value = { row: maxRows - 1, col: colIndex };
      }
    } else {
      // SINGLE 模式：设置新的单一选区
      isMultipleMode.value = false;
      multiSelections.value = [];
      activeCell.value = { row: 0, col: colIndex };
      selectionStart.value = { row: 0, col: colIndex };
      selectionEnd.value = { row: maxRows - 1, col: colIndex };
    }
  };

  /**
   * 全选多行（拖选）
   * @param {number} startRow - 起始行索引
   * @param {number} endRow - 结束行索引
   * @param {number} maxCols - 最大列数
   */
  const selectRows = (startRow, endRow, maxCols) => {
    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);

    isMultipleMode.value = false;
    multiSelections.value = [];
    activeCell.value = { row: minRow, col: 0 };
    selectionStart.value = { row: minRow, col: 0 };
    selectionEnd.value = { row: maxRow, col: maxCols - 1 };
  };

  /**
   * 全选多列（拖选）
   * @param {number} startCol - 起始列索引
   * @param {number} endCol - 结束列索引
   * @param {number} maxRows - 最大行数
   */
  const selectColumns = (startCol, endCol, maxRows) => {
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    isMultipleMode.value = false;
    multiSelections.value = [];
    activeCell.value = { row: 0, col: minCol };
    selectionStart.value = { row: 0, col: minCol };
    selectionEnd.value = { row: maxRows - 1, col: maxCol };
  };

  /**
   * 全选整个表格
   * @param {number} maxRows - 最大行数
   * @param {number} maxCols - 最大列数
   */
  const selectAll = (maxRows, maxCols) => {
    isMultipleMode.value = false;
    multiSelections.value = [];
    activeCell.value = { row: 0, col: 0 };
    selectionStart.value = { row: 0, col: 0 };
    selectionEnd.value = { row: maxRows - 1, col: maxCols - 1 };
  };

  // ==================== 兼容性函数（保持向后兼容） ====================

  /**
   * @deprecated 使用 startSingleSelection 或 startMultipleSelection 代替
   */
  const setSelection = (row, col, addToMultiSelect = false) => {
    if (addToMultiSelect) {
      startMultipleSelection(row, col);
    } else {
      startSingleSelection(row, col);
    }
  };

  /**
   * @deprecated 使用 endMultipleSelectionClick 代替
   */
  const toggleSelectionAtCell = (row, col) => {
    endMultipleSelectionClick(row, col);
  };

  /**
   * @deprecated 使用 endMultipleSelectionDrag 代替
   */
  const addCurrentSelectionToMulti = (options = {}) => {
    return endMultipleSelectionDrag(options);
  };

  return {
    activeCell,
    selectionStart,
    selectionEnd,
    isSelecting,
    normalizedSelection,
    multiSelections,
    isMultipleMode, // 导出多选模式状态
    // 新模式 API
    startSingleSelection,
    updateSingleSelectionEnd,
    startMultipleSelection,
    updateMultipleSelectionEnd,
    endMultipleSelectionClick,
    endMultipleSelectionDrag,
    // 通用函数
    updateSelectionEnd,
    isActive,
    isInSelection,
    isInMultiSelectionOnly,
    shouldUseMultiSelectionStyle,
    isInSelectionHeader,
    moveActiveCell,
    clearMultiSelections,
    clearSelection, // 清除选择函数
    // 全选行/列函数
    selectRow,
    selectColumn,
    selectRows,
    selectColumns,
    selectAll,
    // 兼容性函数
    setSelection,
    toggleSelectionAtCell,
    addCurrentSelectionToMulti,
  };
}
