# Guia de Implantação - Hostinger VPS (Ubuntu + Docker + Traefik)

Este documento descreve como implantar o projeto **ParoquIA** em uma VPS da Hostinger utilizando Docker, Traefik para gerenciamento de tráfego e SSL automático via Let's Encrypt.

## 1. Requisitos Prévios

- VPS com Ubuntu (recomendado 22.04 ou 24.04).
- Domínio apontado para o IP da sua VPS (registros A e/ou CNAME).
- Docker e Docker Compose instalados na VPS.

## 2. Preparação da VPS

Acesse sua VPS via SSH e execute os seguintes comandos para instalar o Docker:

```bash
# Atualizar repositórios
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose (v2 já vem no Docker CLI geralmente)
# Verifique com: docker compose version
```

## 3. Configuração do Projeto

Clone o repositório na sua VPS:

```bash
git clone https://github.com/danielbfs/ParoquIA.git app
cd app
```

Crie o arquivo `.env` baseado no `.env.example`:

```bash
cp .env.example .env
nano .env
```

Preencha as variáveis de ambiente necessárias, especialmente:
- `DOMAIN`: O domínio que você usará (ex: `paroquia.seudominio.com.br`).
- `EMAIL`: Seu e-mail para registro do SSL no Let's Encrypt.
- Todas as chaves do Firebase e do Evolution API.

## 4. Inicialização

Inicie o contêiner:

```bash
docker compose up -d --build
```

**Importante:** Este projeto utiliza a porta `3001` via `127.0.0.1`. Certifique-se de que o seu Traefik central está configurado para ler os labels do Docker e alcançar o serviço através dessa porta.

## 5. Verificação

- O Traefik configurará automaticamente o SSL. Aguarde alguns minutos para o desafio HTTP do Let's Encrypt completar.
- Acesse seu domínio via HTTPS.
- Use `docker compose logs -f app` para monitorar os logs da aplicação.

## 6. Atualização do App

Sempre que fizer um novo push para o GitHub, você pode atualizar a VPS executando:

```bash
docker compose pull
docker compose up -d --build
```

---
**Desenvolvedor:** Daniel Silva (danielbfs@gmail.com)

**Nota sobre Firewall:** Certifique-se de que as portas 80 e 443 estão abertas no firewall da Hostinger (Painel de Controle -> VPS -> Firewall).
