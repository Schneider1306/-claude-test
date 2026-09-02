@echo off
chcp 65001 >nul
setlocal

echo ============================================================
echo   Калькулятор стоимости юридических услуг
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ОШИБКА] Node.js не найден.
    echo Скачайте и установите Node.js версии 20 или новее:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Первый запуск: устанавливаем зависимости...
    echo Это может занять несколько минут.
    echo.
    call npm install
    if errorlevel 1 (
        echo [ОШИБКА] Не удалось установить зависимости.
        pause
        exit /b 1
    )
)

if not exist ".next" (
    echo Собираем production-версию приложения...
    call npm run build
    if errorlevel 1 (
        echo [ОШИБКА] Сборка приложения не удалась.
        pause
        exit /b 1
    )
)

echo.
echo Запускаем приложение на http://localhost:3000
echo Не закрывайте это окно, пока пользуетесь программой.
echo Чтобы остановить — закройте окно или нажмите Ctrl+C.
echo.

start "" "http://localhost:3000"
call npm start

pause
