#!/bin/bash

# BalmSharedMCP Deployment Script
# Handles deployment to various environments

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
IMAGE_NAME="balm-shared-mcp"
CONTAINER_NAME="balm-shared-mcp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show help
show_help() {
    cat << EOF
BalmSharedMCP Deployment Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    build       Build Docker image
    deploy      Deploy to environment
    start       Start services
    stop        Stop services
    restart     Restart services
    logs        Show service logs
    status      Show deployment status
    cleanup     Clean up old images and containers

Options:
    -e, --env ENV       Target environment (dev|staging|prod)
    -t, --tag TAG       Docker image tag (default: latest)
    -f, --force         Force deployment without confirmation
    -h, --help          Show this help message

Examples:
    $0 build
    $0 deploy --env staging
    $0 start --env prod
    $0 logs --env dev

EOF
}

# Parse command line arguments
COMMAND=""
ENVIRONMENT="dev"
IMAGE_TAG="latest"
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        build|deploy|start|stop|restart|logs|status|cleanup)
            COMMAND="$1"
            shift
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate environment
validate_environment() {
    case $ENVIRONMENT in
        dev|staging|prod)
            log_info "Target environment: $ENVIRONMENT"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            log_error "Valid environments: dev, staging, prod"
            exit 1
            ;;
    esac
}

# Build Docker image
build_image() {
    log_info "Building Docker image..."
    
    cd "$PROJECT_DIR"
    
    # Build the image
    docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .
    
    # Tag for environment
    docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "${IMAGE_NAME}:${ENVIRONMENT}-${IMAGE_TAG}"
    
    log_success "Docker image built: ${IMAGE_NAME}:${IMAGE_TAG}"
}

# Deploy to environment
deploy_to_environment() {
    log_info "Deploying to $ENVIRONMENT environment..."
    
    validate_environment
    
    # Check if image exists
    if ! docker image inspect "${IMAGE_NAME}:${IMAGE_TAG}" >/dev/null 2>&1; then
        log_warning "Image not found, building..."
        build_image
    fi
    
    # Environment-specific configuration
    COMPOSE_FILE="docker-compose.yml"
    ENV_FILE=".env.${ENVIRONMENT}"
    
    if [[ -f "$PROJECT_DIR/$ENV_FILE" ]]; then
        log_info "Using environment file: $ENV_FILE"
        export $(cat "$PROJECT_DIR/$ENV_FILE" | grep -v '^#' | xargs)
    fi
    
    # Deploy based on environment
    case $ENVIRONMENT in
        dev)
            deploy_dev
            ;;
        staging)
            deploy_staging
            ;;
        prod)
            deploy_prod
            ;;
    esac
    
    log_success "Deployment to $ENVIRONMENT completed"
}

# Development deployment
deploy_dev() {
    log_info "Deploying to development environment..."
    
    cd "$PROJECT_DIR"
    
    # Use docker-compose for development
    docker-compose -f docker-compose.yml up -d
    
    log_info "Development services started"
}

# Staging deployment
deploy_staging() {
    log_info "Deploying to staging environment..."
    
    if [[ "$FORCE" != true ]]; then
        read -p "Deploy to staging environment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi
    
    cd "$PROJECT_DIR"
    
    # Stop existing containers
    docker-compose down || true
    
    # Deploy with staging configuration
    docker-compose -f docker-compose.yml up -d
    
    log_info "Staging deployment completed"
}

# Production deployment
deploy_prod() {
    log_info "Deploying to production environment..."
    
    if [[ "$FORCE" != true ]]; then
        log_warning "This will deploy to PRODUCTION environment!"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Production deployment cancelled"
            exit 0
        fi
    fi
    
    cd "$PROJECT_DIR"
    
    # Backup current deployment
    log_info "Creating backup..."
    docker-compose down || true
    
    # Deploy to production
    docker-compose -f docker-compose.yml up -d
    
    # Verify deployment
    sleep 10
    if docker-compose ps | grep -q "Up"; then
        log_success "Production deployment successful"
    else
        log_error "Production deployment failed"
        exit 1
    fi
}

# Start services
start_services() {
    log_info "Starting services..."
    
    cd "$PROJECT_DIR"
    docker-compose up -d
    
    log_success "Services started"
}

# Stop services
stop_services() {
    log_info "Stopping services..."
    
    cd "$PROJECT_DIR"
    docker-compose down
    
    log_success "Services stopped"
}

# Restart services
restart_services() {
    log_info "Restarting services..."
    
    stop_services
    sleep 2
    start_services
    
    log_success "Services restarted"
}

# Show logs
show_logs() {
    log_info "Showing service logs..."
    
    cd "$PROJECT_DIR"
    docker-compose logs -f --tail=100
}

# Show status
show_status() {
    log_info "Service status:"
    
    cd "$PROJECT_DIR"
    docker-compose ps
    
    echo
    log_info "Docker images:"
    docker images | grep "$IMAGE_NAME" || log_warning "No images found"
}

# Cleanup old images and containers
cleanup() {
    log_info "Cleaning up old images and containers..."
    
    # Remove stopped containers
    docker container prune -f
    
    # Remove unused images
    docker image prune -f
    
    # Remove old tagged images (keep latest 3)
    OLD_IMAGES=$(docker images "${IMAGE_NAME}" --format "table {{.Repository}}:{{.Tag}}" | tail -n +2 | tail -n +4)
    if [[ -n "$OLD_IMAGES" ]]; then
        echo "$OLD_IMAGES" | xargs docker rmi || true
    fi
    
    log_success "Cleanup completed"
}

# Main execution
main() {
    if [[ -z "$COMMAND" ]]; then
        log_error "No command specified"
        show_help
        exit 1
    fi
    
    log_info "BalmSharedMCP Deployment Script"
    log_info "Command: $COMMAND"
    log_info "Environment: $ENVIRONMENT"
    log_info "Image tag: $IMAGE_TAG"
    echo
    
    case $COMMAND in
        build)
            build_image
            ;;
        deploy)
            deploy_to_environment
            ;;
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        logs)
            show_logs
            ;;
        status)
            show_status
            ;;
        cleanup)
            cleanup
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"