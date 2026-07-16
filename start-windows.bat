@echo off
chcp 65001 >nul
title Экономика юридической практики
setlocal

echo ============================================================
echo   Экономика юридической практики — запуск приложения
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ОШИБКА] Node.js не найден.
    echo Установите Node.js версии 20 или новее с сайта https://nodejs.org
    echo и запустите этот файл ещё раз.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Первый запуск: устанавливаю зависимости, это может занять пару минут...
    call npm install
    if errorlevel 1 (
        echo [ОШИБКА] Не удалось установить зависимости.
        pause
        exit /b 1
    )
)

if not exist "data\legal-practice.db" (
    echo Создаю базу данных и стартовые настройки...
    call npm run db:setup
    if errorlevel 1 (
        echo [ОШИБКА] Не удалось создать базу данных.
        pause
        exit /b 1
    )
) else (
    echo Применяю обновления структуры базы данных, если они есть...
    call npm run db:migrate
)

echo Собираю приложение...
call npm run build
if errorlevel 1 (
    echo [ОШИБКА] Сборка приложения не удалась.
    pause
    exit /b 1
)

echo.
echo Запускаю приложение. Как только увидите строку "Ready" —
echo откройте в браузере адрес: http://localhost:3000
echo.
echo Чтобы остановить приложение, закройте это окно или нажмите Ctrl+C.
echo.

call npm start

pause
