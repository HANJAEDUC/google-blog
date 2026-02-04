#!/bin/bash

# Absolute paths
NODE_PATH="/Users/jaeduchan/.nvm/versions/node/v24.13.0/bin/node"
PROJECT_DIR="/Users/jaeduchan/Documents/jhan/antigravity/GoogleBlog/google-blog"
SCRIPT_PATH="$PROJECT_DIR/scripts/crawl_aldi.js"
LOG_PATH="$PROJECT_DIR/scripts/crawl.log"

# The cron schedule string (7:00 AM daily)
CRON_JOB="0 7 * * * $NODE_PATH $SCRIPT_PATH >> $LOG_PATH 2>&1"

# Check if cron job already exists
(crontab -l 2>/dev/null | grep -F "$SCRIPT_PATH") > /dev/null

if [ $? -eq 0 ]; then
    echo "Cron job for Aldi crawl is already installed."
else
    # Install the cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "Cron job installed: Run daily at 07:00 AM"
    echo "Logs will be saved to: $LOG_PATH"
fi
