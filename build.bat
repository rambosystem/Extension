@echo off
setlocal

:: 源目录为脚本所在目录
set "SRC=%~dp0"
:: 目标目录
set "TGT=E:\Edge_Extension\extension_package"

echo 源: %SRC%
echo 目标: %TGT%
echo.

:: 创建目标目录（若不存在）
mkdir "%TGT%" 2>nul

:: 覆盖复制文件夹
for %%D in (dist images options popup src) do (
  echo [DIR] 复制 %%D ...
  robocopy "%SRC%%%D" "%TGT%\%%D" /E /R:1 /W:1 /NFL /NDL /NP /NJH /NJS >nul
)

:: 覆盖复制文件
for %%F in (background.js content.js manifest.json) do (
  if exist "%SRC%%%F" (
    echo [FILE] 复制 %%F ...
    copy /Y "%SRC%%%F" "%TGT%\%%F" >nul
  )
)

echo 完成。
exit /b 0