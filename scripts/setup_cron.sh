#!/bin/bash

# Absolute paths
NODE_PATH="/Users/jaeduchan/.nvm/versions/node/v24.13.0/bin/node"
PROJECT_DIR="/Users/jaeduchan/Documents/jhan/antigravity/GoogleBlog/google-blog"

# Aldi Crawl Configuration
ALDI_SCRIPT="$PROJECT_DIR/scripts/crawl_aldi.js"
ALDI_LOG="$PROJECT_DIR/scripts/crawl.log"
ALDI_CRON="0 7 * * * $NODE_PATH $ALDI_SCRIPT >> $ALDI_LOG 2>&1"

# Words Shuffle Configuration
SHUFFLE_SCRIPT="$PROJECT_DIR/scripts/shuffle_words.js"
SHUFFLE_LOG="$PROJECT_DIR/scripts/shuffle.log"
SHUFFLE_CRON="0 7 * * * $NODE_PATH $SHUFFLE_SCRIPT >> $SHUFFLE_LOG 2>&1"

echo "=== Setting up Cron Jobs ==="

# Install Aldi Crawl Job
(crontab -l 2>/dev/null | grep -F "$ALDI_SCRIPT") > /dev/null
if [ $? -eq 0 ]; then
    echo "✓ Aldi crawl cron job already installed"
else
    (crontab -l 2>/dev/null; echo "$ALDI_CRON") | crontab -
    echo "✓ Aldi crawl cron job installed (07:00 AM daily)"
fi

# Install Words Shuffle Job
(crontab -l 2>/dev/null | grep -F "$SHUFFLE_SCRIPT") > /dev/null
if [ $? -eq 0 ]; then
    echo "✓ Words shuffle cron job already installed"
else
    (crontab -l 2>/dev/null; echo "$SHUFFLE_CRON") | crontab -
    echo "✓ Words shuffle cron job installed (07:00 AM daily)"
fi

echo ""
echo "=== Current Cron Jobs ==="
crontab -l
