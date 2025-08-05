"""
Browser launcher utility for automatically opening the Sentinela application.

This module handles cross-platform browser launching with Chrome/Chromium detection
and configuration for optimal application performance. It launches the browser in
app mode with specific flags to disable throttling and enable autoplay for the
video monitoring interface.
"""

import asyncio
import logging
import platform
import subprocess
import time

logger = logging.getLogger(__name__)

async def launch_browser(port: int, path_prefix: str = ""):
    await asyncio.sleep(2)
    logger.info("launching browser")

    url = f'http://localhost:{port}{path_prefix}?t={int(time.time())}'
    system = platform.system().lower()
    chrome_args = [
        f"--app={url}",
        "--new-window",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--autoplay-policy=no-user-gesture-required",
    ]
    
    try:
        if system == 'darwin':
            cmd = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] + chrome_args
        elif system == 'linux':
            chrome_paths = [
                'google-chrome',
                'google-chrome-stable',
                'chrome',
                'chromium',
                'chromium-browser'
            ]
            cmd = None
            for chrome_path in chrome_paths:
                try:
                    subprocess.run(['which', chrome_path], check=True, capture_output=True)
                    cmd = [chrome_path] + chrome_args
                    break
                except subprocess.CalledProcessError:
                    continue
            
            if not cmd:
                raise Exception("Chrome/Chromium not found in PATH")
        else:
            raise Exception(f"Unsupported platform: {system}")
        
        subprocess.Popen(cmd)

    except Exception as e:
        logger.error(f"Unable to launch browser: {e}")
