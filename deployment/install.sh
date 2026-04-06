#!/bin/bash
# Mr. Robot Installation Script for Linux (including Raspberry Pi)
# Usage: curl -fsSL https://raw.githubusercontent.com/matheus-rech/mr-robot/main/deployment/install.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Mr. Robot Installation Script      ║${NC}"
echo -e "${GREEN}║   Personal AI Assistant               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Error: Please do not run this script as root${NC}"
    echo "Run as a regular user: curl -fsSL ... | bash"
    exit 1
fi

# Detect architecture
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        PLATFORM="linux-x64"
        ;;
    aarch64|arm64)
        PLATFORM="linux-arm64"
        echo -e "${GREEN}✓ Raspberry Pi / ARM64 detected${NC}"
        ;;
    armv7l)
        echo -e "${RED}Error: 32-bit ARM is not supported. Please use 64-bit OS.${NC}"
        exit 1
        ;;
    *)
        echo -e "${YELLOW}Warning: Unknown architecture: $ARCH${NC}"
        PLATFORM="linux-x64"
        ;;
esac

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Installing Node.js 20...${NC}"

    # Install Node.js using NodeSource
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs

    if ! command -v node &> /dev/null; then
        echo -e "${RED}Failed to install Node.js${NC}"
        exit 1
    fi
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js $NODE_VERSION installed${NC}"

# Check required dependencies
echo "Checking system dependencies..."
MISSING_DEPS=()

if ! command -v git &> /dev/null; then
    MISSING_DEPS+=("git")
fi

if ! command -v sqlite3 &> /dev/null; then
    MISSING_DEPS+=("sqlite3")
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${YELLOW}Installing missing dependencies: ${MISSING_DEPS[*]}${NC}"
    sudo apt-get update
    sudo apt-get install -y "${MISSING_DEPS[@]}"
fi

# Installation directory
INSTALL_DIR="/opt/mr-robot"
DATA_DIR="$INSTALL_DIR/data"

echo ""
echo -e "${GREEN}Installing Mr. Robot to: $INSTALL_DIR${NC}"
echo ""

# Create installation directory
sudo mkdir -p "$INSTALL_DIR"
sudo chown $USER:$USER "$INSTALL_DIR"

# Download latest release
echo "Downloading latest release..."
LATEST_RELEASE=$(curl -s https://api.github.com/repos/matheus-rech/mr-robot/releases/latest | grep "tag_name" | cut -d '"' -f 4)

if [ -z "$LATEST_RELEASE" ]; then
    echo -e "${RED}Failed to get latest release${NC}"
    exit 1
fi

echo -e "${GREEN}Latest version: $LATEST_RELEASE${NC}"

# Download and extract
DOWNLOAD_URL="https://github.com/matheus-rech/mr-robot/releases/download/$LATEST_RELEASE/mr-robot-$LATEST_RELEASE.tar.gz"
curl -L "$DOWNLOAD_URL" -o "/tmp/mr-robot.tar.gz"

cd "$INSTALL_DIR"
tar -xzf "/tmp/mr-robot.tar.gz" --strip-components=1
rm "/tmp/mr-robot.tar.gz"

# Install production dependencies
echo "Installing dependencies..."
npm install --production

# Create data directory
mkdir -p "$DATA_DIR"

# Setup configuration
if [ ! -f "$INSTALL_DIR/.env" ]; then
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════${NC}"
    echo -e "${YELLOW}  Configuration Setup${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════${NC}"
    echo ""

    # Run setup wizard
    npm run setup
else
    echo -e "${GREEN}✓ Configuration file already exists${NC}"
fi

# Setup systemd service
echo ""
echo "Setting up systemd service..."

# Create dedicated user if doesn't exist
if ! id "mrrobot" &>/dev/null; then
    sudo useradd -r -s /bin/false -d "$INSTALL_DIR" mrrobot
    echo -e "${GREEN}✓ Created mrrobot user${NC}"
fi

sudo chown -R mrrobot:mrrobot "$INSTALL_DIR"
sudo chmod 600 "$INSTALL_DIR/.env"

# Copy systemd service file
sudo cp "$INSTALL_DIR/deployment/mr-robot.service" /etc/systemd/system/
sudo systemctl daemon-reload

echo -e "${GREEN}✓ Systemd service installed${NC}"

# Prompt to enable and start service
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo "Service management commands:"
echo "  sudo systemctl start mr-robot     # Start the service"
echo "  sudo systemctl stop mr-robot      # Stop the service"
echo "  sudo systemctl enable mr-robot    # Enable auto-start on boot"
echo "  sudo systemctl status mr-robot    # Check service status"
echo "  sudo journalctl -u mr-robot -f    # View logs"
echo ""
echo "Health check: http://localhost:3000/health"
echo ""

read -p "Do you want to enable and start Mr. Robot now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo systemctl enable mr-robot
    sudo systemctl start mr-robot
    sleep 3
    sudo systemctl status mr-robot --no-pager
    echo ""
    echo -e "${GREEN}✓ Mr. Robot is running!${NC}"
    echo "Access health check at: http://localhost:3000/health"
fi

echo ""
echo -e "${GREEN}Installation finished successfully!${NC}"
echo "Documentation: https://github.com/matheus-rech/mr-robot"
