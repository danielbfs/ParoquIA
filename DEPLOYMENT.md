# Guia de Implantação - AWS Lightsail (Ubuntu + Docker + Traefik)

Este documento descreve como implantar o **ParoquIA** numa instância AWS Lightsail
usando Docker. O `docker-compose.yml` é autocontido: sobe o app **e** um Traefik
que cuida do roteamento e do SSL automático via Let's Encrypt.

## 1. Criar a instância Lightsail

No console **AWS Lightsail → Create instance**:

- **Region:** São Paulo (`sa-east-1`).
- **Platform:** Linux/Unix → **Blueprint: OS Only → Ubuntu 24.04 LTS**.
- **SSH key:** crie/baixe o `.pem`.
- **Plano:** 2 GB RAM / 2 vCPU recomendado (o `vite build` roda no container).
  Mínimo: 1 GB + swap (ver passo 2).
- Após criar:
  - **Networking → Static IP:** crie e anexe um IP estático.
  - **Networking → Firewall:** libere **80 (HTTP)** e **443 (HTTPS)**; mantenha
    **22 (SSH)** (de preferência restrito ao seu IP).
- **DNS:** aponte um registro **A** do seu domínio para o IP estático.

## 2. Preparação do servidor

Acesse via SSH (`ssh -i chave.pem ubuntu@SEU_IP`) e instale o Docker:

```bash
sudo apt update && sudo apt upgrade -y

# Docker + Compose plugin
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu   # rode novo login/SSH para aplicar
docker compose version           # confirme a v2
```

**Swap (obrigatório no plano de 1 GB, opcional no de 2 GB):**

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 3. Configuração do projeto

```bash
git clone https://github.com/danielbfs/ParoquIA.git app
cd app
cp .env.example .env
nano .env
```

Preencha, em especial:
- `DOMAIN`: domínio apontado para o IP (ex: `paroquia.seudominio.com.br`).
- `EMAIL`: e-mail para registro do SSL no Let's Encrypt.
- `GEMINI_API_KEY` / `AI_API_KEY`: chave da IA.
- `VITE_FIREBASE_*` e `VITE_EVOLUTION_*`: credenciais do Firebase e Evolution.
- `SMTP_*` e `CONTACT_EMAIL_TO`: para o formulário de contato.

Substitua também o `firebase-applet-config.json` pelas credenciais reais do
projeto Firebase (não versionado).

## 4. Inicialização

```bash
docker compose up -d --build
```

O Traefik resolve o SSL automaticamente (desafio HTTP-01). Aguarde 1-2 min e
acesse `https://SEU_DOMINIO`.

## 5. Persistência

A sessão do WhatsApp (Baileys) e a mídia são gravadas em volumes Docker
(`whatsapp_sessions`, `whatsapp_media`) e **sobrevivem a rebuilds/deploys** — não
é preciso reescanear o QR Code a cada atualização. O certificado SSL fica no
volume `letsencrypt`.

## 6. Operação

```bash
docker compose logs -f app        # logs do app
docker compose logs -f traefik    # logs do proxy/SSL
docker compose ps                 # status

# Atualizar após um novo push:
git pull
docker compose up -d --build
```

---
**Desenvolvedor:** Daniel Silva (danielbfs@gmail.com)
