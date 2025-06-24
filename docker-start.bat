@echo off
REM =============================================================================
REM MISTRAL NETWORK SECURITY ANALYSIS - DOCKER STARTUP SCRIPT (Windows)
REM =============================================================================

echo Starting Mistral Network Security Analysis Platform
echo =============================================

REM Check if .env file exists
if not exist ".env" (
    echo Error: .env file not found!
    echo Please ensure your .env file exists in the root directory with required environment variables.
    pause
    exit /b 1
)

REM Check command line argument
set "command=%~1"
if "%command%"=="" set "command=start"

if "%command%"=="start" goto :start
if "%command%"=="stop" goto :stop
if "%command%"=="restart" goto :restart
if "%command%"=="status" goto :status
if "%command%"=="logs" goto :logs
if "%command%"=="app" goto :app
if "%command%"=="help" goto :help
if "%command%"=="-h" goto :help
if "%command%"=="--help" goto :help

echo Unknown command: %command%
echo Use 'docker-start.bat help' for usage information.
pause
exit /b 1

:start
echo Building and starting all services...
docker-compose up --build -d

echo.
echo Waiting for services to be ready...
echo This may take a few minutes on first startup...

echo.
echo All services started successfully!
echo.
echo Service URLs:
echo   * Neo4j Browser:  http://localhost:7474
echo   * Minio Console:  http://localhost:9001
echo   * Milvus Health:  http://localhost:9091/healthz
echo   * Application:    docker-compose exec mistral-app bash
echo.
echo To view logs: docker-compose logs -f [service-name]
echo To stop all:  docker-compose down
pause
goto :eof

:stop
echo Stopping all services...
docker-compose down
echo All services stopped.
pause
goto :eof

:restart
call :stop
call :start
goto :eof

:status
echo Service Status:
docker-compose ps
pause
goto :eof

:logs
if "%~2"=="" (
    docker-compose logs -f
) else (
    docker-compose logs -f %~2
)
goto :eof

:app
echo Entering application container...
docker-compose exec mistral-app bash
goto :eof

:help
echo Usage: docker-start.bat {start^|stop^|restart^|status^|logs [service]^|app^|help}
echo.
echo Commands:
echo   start    - Start all services (default)
echo   stop     - Stop all services
echo   restart  - Restart all services
echo   status   - Show service status
echo   logs     - Show logs (optionally for specific service)
echo   app      - Enter the application container
echo   help     - Show this help message
pause
goto :eof 