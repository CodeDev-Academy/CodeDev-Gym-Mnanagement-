@echo off
title Gym OS - Password Recovery Utility
color 0A

:: Navigate to the directory containing this batch file
cd /d "%~dp0"

:: Check if the virtual environment exists
if not exist "gym_backend\venv\Scripts\python.exe" (
    echo ERROR: Python virtual environment not found in gym_backend\venv
    pause
    exit /b 1
)

:: Run the recovery script using the local backend Python interpreter
"gym_backend\venv\Scripts\python.exe" "gym_backend\scripts\reset_password.py"
