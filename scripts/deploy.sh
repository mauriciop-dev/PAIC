#!/bin/bash
# PAIC Admin - Deploy Script
# Uso: ./scripts/deploy.sh [vercel|supabase|all]

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADMIN_DIR="$PROJECT_ROOT/apps/admin"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 no está instalado. Instálalo primero."
        exit 1
    fi
}

deploy_supabase() {
    log_info "=== Deploy Supabase Edge Functions ==="
    
    check_command "supabase"
    
    # Check if linked
    if [ ! -f "$PROJECT_ROOT/supabase/.temp/project-ref" ]; then
        log_warn "Proyecto no linkeado. Ejecuta: supabase link --project-ref TU_PROJECT_REF"
        read -p "Project Ref: " PROJECT_REF
        supabase link --project-ref "$PROJECT_REF"
    fi
    
    log_info "Deploying Edge Functions..."
    
    FUNCTIONS=(
        "agent-actions/execute-action"
        "agent-actions/block-ip"
        "agent-actions/create-pr-fix"
        "agent-actions/simplify-form"
        "agent-actions/revoke-sessions"
        "agent-actions/notify-admin"
        "send-push"
    )
    
    for fn in "${FUNCTIONS[@]}"; do
        log_info "Deploying $fn..."
        supabase functions deploy "$fn" --project-ref "$(cat supabase/.temp/project-ref 2>/dev/null || echo "")"
    done
    
    log_info "✅ Supabase functions deployed"
}

deploy_vercel() {
    log_info "=== Deploy Vercel ==="
    
    check_command "vercel"
    
    cd "$ADMIN_DIR"
    
    log_info "Building..."
    npm run build
    
    log_info "Deploying to Vercel..."
    if [ "$1" = "prod" ]; then
        vercel --prod --token="$VERCEL_TOKEN"
    else
        vercel --token="$VERCEL_TOKEN"
    fi
    
    log_info "✅ Vercel deployed"
}

run_tests() {
    log_info "=== Running Tests ==="
    cd "$ADMIN_DIR"
    
    log_info "Running lint..."
    npm run lint
    
    log_info "Running build..."
    npm run build
    
    if command -v npx playwright &> /dev/null; then
        log_info "Running Playwright tests..."
        npx playwright test
    else
        log_warn "Playwright not installed, skipping e2e tests"
    fi
    
    log_info "✅ Tests passed"
}

setup_secrets() {
    log_info "=== Configuring Supabase Secrets ==="
    
    check_command "supabase"
    
    log_warn "Configura estos secrets en Supabase Dashboard → Settings → Edge Functions → Secrets:"
    echo ""
    echo "VAPID_PUBLIC_KEY=BA-uWhxWA8qYGnh9of0h47_OWojH7w2qmGAVp6sxVLyKBLrYF_I_GFxFreTyFMYmrZxaJrEi0gETu1S9nQcN3oc"
    echo "VAPID_PRIVATE_KEY=2HeKt8OR6Dh5Rh6jVCzm_oBeL4fVvjdYRNlHNo9M79M"
    echo "GITHUB_TOKEN=ghp_xxx  # Para create-pr-fix"
    echo "RESEND_API_KEY=re_xxx  # Opcional"
    echo "TWILIO_ACCOUNT_SID=ACxxx  # Opcional"
    echo "TWILIO_AUTH_TOKEN=xxx  # Opcional"
    echo "SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx  # Opcional"
    echo ""
    read -p "Presiona Enter cuando hayas configurado los secrets..."
}

run_migrations() {
    log_info "=== Running SQL Migrations ==="
    log_warn "Ejecuta estos SQLs en Supabase SQL Editor:"
    echo ""
    echo "1. platform_admins: supabase/migrations/20261001_platform_admins.sql"
    echo "2. push_subscriptions: supabase/migrations/20261001_push_subscriptions.sql"
    echo ""
    echo "3. Insert superadmin (reemplaza TU_USER_ID):"
    echo "INSERT INTO public.platform_admins (user_id, email, nombre, rol, activo)"
    echo "VALUES ('TU_USER_ID', 'micnux.ia@gmail.com', 'Super Admin', 'superadmin', true)"
    echo "ON CONFLICT (user_id) DO UPDATE SET activo = true, rol = 'superadmin';"
    echo ""
    read -p "Presiona Enter cuando hayas ejecutado las migraciones..."
}

verify_deployment() {
    log_info "=== Verifying Deployment ==="
    
    ADMIN_URL="https://admin.paicai.com.co"
    
    log_info "Verificando $ADMIN_URL ..."
    
    # Check if domain responds
    if curl -s -o /dev/null -w "%{http_code}" "$ADMIN_URL" | grep -q "200\|302"; then
        log_info "✅ Dominio responde"
    else
        log_warn "⚠️ Dominio no responde aún (puede tardar unos minutos)"
    fi
    
    # Check Supabase functions
    log_info "Verificando Edge Functions..."
    supabase functions list
    
    log_info "✅ Verificación completada"
}

# Main
case "${1:-all}" in
    supabase)
        setup_secrets
        run_migrations
        deploy_supabase
        ;;
    vercel)
        deploy_vercel "$2"
        ;;
    test)
        run_tests
        ;;
    verify)
        verify_deployment
        ;;
    all)
        run_tests
        setup_secrets
        run_migrations
        deploy_supabase
        deploy_vercel prod
        verify_deployment
        ;;
    *)
        echo "Uso: $0 {supabase|vercel|test|verify|all} [prod]"
        echo ""
        echo "Comandos:"
        echo "  supabase    - Deploy Edge Functions + secrets + migraciones"
        echo "  vercel      - Deploy a Vercel (prod para producción)"
        echo "  test        - Ejecutar tests (lint, build, e2e)"
        echo "  verify      - Verificar deployment"
        echo "  all         - Todo lo anterior (default)"
        exit 1
        ;;
esac