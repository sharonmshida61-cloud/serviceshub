#!/bin/bash

echo "========================================"
echo "PostgreSQL Setup for LocalServices"
echo "========================================"
echo

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed"
    echo "Please install Docker from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "ERROR: Docker is not running"
    echo "Please start Docker and try again"
    exit 1
fi

echo "Starting PostgreSQL container..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to start PostgreSQL container"
    exit 1
fi

echo
echo "Waiting for PostgreSQL to be ready..."
sleep 5

echo
echo "PostgreSQL is running!"
echo
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: localservices"
echo "  User: postgres"
echo "  Password: postgres"
echo
echo "Next steps:"
echo "  1. cd backend"
echo "  2. npx prisma migrate dev --name init"
echo "  3. npm run seed"
echo "  4. npm run dev"
echo
