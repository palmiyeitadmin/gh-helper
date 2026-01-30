@echo off
REM Git Helper CLI - Run from any git repository
REM Usage: gh.cmd [command] [options]
REM        gh.cmd           - Interactive mode
REM        gh.cmd status    - Show status
REM        gh.cmd commit    - Interactive commit
REM        gh.cmd push      - Push to GitHub
REM        gh.cmd history   - Show history

node C:\tools\git-helper\dist\index.js %*
