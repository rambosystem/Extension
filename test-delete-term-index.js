// 测试删除term索引接口
// 这个文件用于验证/term-match/terms接口是否正常工作

const API_BASE_URL = 'http://43.142.250.179:8000';

// 模拟deleteTermIndex函数
async function deleteTermIndex(termIds) {
  try {
    // 验证输入参数
    if (!Array.isArray(termIds)) {
      throw new Error('Term IDs must be an array');
    }

    // 验证每个term ID
    for (let i = 0; i < termIds.length; i++) {
      if (typeof termIds[i] !== 'number' || termIds[i] <= 0) {
        throw new Error(`Term ID at index ${i} must be a positive number`);
      }
    }

    const response = await fetch(`${API_BASE_URL}/term-match/terms`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ term_ids: termIds }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Delete Term Index API request failed: ${response.status} ${response.statusText}. ${
          errorData.error?.message || errorData.message || ''
        }`
      );
    }

    const data = await response.json();
    
    // 验证返回的数据格式
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format from Delete Term Index API');
    }

    return data;
  } catch (error) {
    console.error('Failed to delete term index:', error);
    throw error;
  }
}

// 测试函数
async function testDeleteTermIndex() {
  console.log("=== 测试删除term索引接口 ===");
  
  try {
    // 1. 测试删除单个term索引
    console.log("\n1. 测试删除单个term索引:");
    const singleTermIds = [1];
    const singleResult = await deleteTermIndex(singleTermIds);
    console.log("✅ 单个term索引删除成功");
    console.log("响应数据:", singleResult);
    
    // 2. 测试删除多个term索引
    console.log("\n2. 测试删除多个term索引:");
    const multipleTermIds = [2, 3, 4];
    const multipleResult = await deleteTermIndex(multipleTermIds);
    console.log("✅ 多个term索引删除成功");
    console.log("响应数据:", multipleResult);
    
    // 3. 测试空数组
    console.log("\n3. 测试空数组:");
    try {
      const emptyResult = await deleteTermIndex([]);
      console.log("✅ 空数组删除成功");
      console.log("响应数据:", emptyResult);
    } catch (error) {
      console.log("❌ 空数组删除失败:", error.message);
    }
    
    // 4. 测试无效参数
    console.log("\n4. 测试无效参数:");
    try {
      await deleteTermIndex([0, -1]);
      console.log("❌ 应该失败但成功了");
    } catch (error) {
      console.log("✅ 无效参数正确被拒绝:", error.message);
    }
    
    // 5. 检查响应格式
    console.log("\n5. 检查响应格式:");
    if (singleResult.message) {
      console.log("消息:", singleResult.message);
    }
    if (singleResult.status) {
      console.log("状态:", singleResult.status);
    }
    if (singleResult.deleted_count) {
      console.log("删除数量:", singleResult.deleted_count);
    }
    if (singleResult.deleted_term_ids) {
      console.log("删除的term IDs:", singleResult.deleted_term_ids);
    }
    
  } catch (error) {
    console.error("❌ 测试失败:", error.message);
  }
  
  console.log("\n=== 删除term索引接口测试完成 ===");
}

// 运行测试
testDeleteTermIndex().catch(console.error); 