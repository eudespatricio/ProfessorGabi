# Instalar o Gabi no tablet

O app é uma PWA (site que vira aplicativo). Para o **microfone** e a **instalação como app**, o endereço precisa ser **HTTPS** — é exigência do Chrome, não do Gabi.

Escolha um caminho. O A é o mais tranquilo para o dia a dia.

---

## Caminho A — link fixo e grátis (recomendado)

Sem conta paga, sem computador ligado depois.

1. No computador, abra **https://app.netlify.com/drop**
2. Arraste a pasta **`app`** (somente ela) para a área indicada.
3. Espere o envio. O Netlify mostra um endereço tipo `https://algo-aleatorio.netlify.app`.
4. Abra esse endereço no **Chrome do tablet**.
5. No Chrome, toque no menu **⋮ → Instalar app** (ou “Adicionar à tela inicial”).
6. Autorize o microfone quando o app pedir.

Pronto: ícone na tela inicial, tela cheia, e o progresso fica salvo no tablet.

> Para trocar o nome do endereço (ex.: `gabi-leitura.netlify.app`) crie uma conta gratuita no Netlify e renomeie o site. O endereço gratuito já funciona.

**Atualizar depois de mudar o app:** arraste a pasta de novo no Netlify (ou use `Deploys → Drag and drop`). Antes, aumente a versão em **dois lugares**: `app/sw.js` (`const VERSION = 'gabi-vN'`) e `app/js/version.js` (`APP_VERSION = 'vN'`) — o `check-sw` confere se batem. No tablet, feche e abra o app duas vezes. Na primeira instalação, o app baixa também os 1.116 clipes de voz (4,1 MB) para funcionar offline.

---

## Caminho B — túnel HTTPS temporário (sem conta)

Use quando quiser testar hoje, sem publicar nada.

1. No computador, dê dois cliques em **`start-tunnel.ps1`** (ou rode no PowerShell).
   - Na primeira vez ele baixa o `cloudflared` (~55 MB). Se o Windows perguntar, permita.
2. Espera alguns segundos. Vai aparecer um endereço tipo:
   `https://alguma-coisa-aleatoria.trycloudflare.com`
3. Digite esse endereço no Chrome do tablet.
4. Instale como app pelo menu ⋮.

**Limitações:** o link muda a cada vez que você abre o túnel e o computador precisa estar ligado com internet enquanto a criança usar o microfone. O app continua abrindo offline no tablet, mas a leitura em voz alta precisa do link ativo.

---

## Caminho C — só na rede Wi-Fi (sem microfone)

Para usar agora, sem internet e sem instalar.

1. Computador e tablet na **mesma rede Wi-Fi**.
2. Dê dois cliques em **`start.cmd`**.
3. A janela mostra um endereço tipo `http://192.168.0.10:8080`.
4. Digite no Chrome do tablet.

Nesse modo o app **não instala** e **não escuta a voz** (o Chrome bloqueia microfone em `http://`). Todas as outras atividades funcionam, e a leitura em voz alta usa o modo “✅ Eu li”.

---

## Caminho D — HTTPS pelo IP (instalar de verdade no tablet)

**Por que:** o Chrome só libera **microfone**, **reconhecimento de fala** e **instalação como app** em endereços `https://` (ou `localhost`). Em `http://192.168.x.x` o app abre, mas o microfone nunca funciona e o menu “Instalar app” não aparece. Isso não é limitação do Gabi — é regra de segurança do navegador.

O projeto já vem com um certificado local gerado para o IP **192.168.1.6**.

1. No computador, dê dois cliques em **`start-https.ps1`** (ou rode no PowerShell).
2. Ele mostra o endereço, por exemplo: `https://192.168.1.6:8443`.
3. No **tablet Android**, abra esse endereço no Chrome.
   - Vai aparecer “Sua conexão não é particular”. Toque em **Avançado → Continuar**.
4. Para o microfone funcionar **sem** esse aviso em todas as visitas, instale o certificado:
   - acesse `https://192.168.1.6:8443/ca.crt` (baixa o arquivo);
   - **Configurações → Segurança → Criptografia e credenciais → Instalar certificado → Certificado de CA** (Android 11+) ou **Instalar do armazenamento** (versões antigas);
   - escolha o arquivo baixado e confirme.
   - Depois feche e abra o Chrome de novo.
5. Menu ⋮ → **Instalar app** (ou “Adicionar à tela inicial”). Agora instala.
6. Autorize o microfone quando o app pedir.

> Se o IP do computador mudar (roteador reiniciou, outra rede), o certificado deixa de bater. Gere outro com o IP novo:
> `wsl bash -lc "cd /mnt/c/Users/Eudes/ProfessorGabi/certs && openssl req -newkey rsa:2048 -nodes -keyout server.key -out server.csr -subj '/CN=SEU_IP' && printf 'subjectAltName=IP:SEU_IP,IP:127.0.0.1,DNS:localhost\nextendedKeyUsage=serverAuth\n' > san.cnf && openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt -days 3650 -sha256 -extfile san.cnf"`
> Depois reinstale o `ca.crt` no tablet.

**Alternativa sem mexer em certificado:** `start-tunnel.ps1` gera um link `https://….trycloudflare.com` válido na hora (o computador precisa estar ligado durante o uso do microfone).

## Depois de instalar

- **Tela cheia:** abra pelo ícone do Gabi, não pelo navegador.
- **Microfone:** se negou sem querer, toque no cadeado (ou ⋮ → Configurações do site) e libere o microfone.
- **Voz da Gabi:** a voz vem do sistema. Se não falar, veja em *Configurações do Android → Idioma e entrada → Saída de texto para fala* se há uma voz em português instalada. Nos ajustes do app (Pais → Ajustes) dá para escolher a voz e a velocidade.
- **Diagnóstico:** em **Pais → Dados** há a versão do app, quantas vozes pt-BR o tablet tem e o botão **🎧 Verificar áudio offline** (deve mostrar `1116/1116`). Se mostrar menos, abra o app com internet uma vez.
- **Backup:** Pais → Dados e backup → Exportar. Guarde o arquivo no Google Drive ou mande por e-mail. Se o tablet for formatado ou o endereço mudar, dá para importar.

---

## Problemas comuns

| Sintoma | O que fazer |
| --- | --- |
| “Site não seguro” ou não instala | Precisa de HTTPS (Caminho A ou B). Em `http://` o Chrome não instala. |
| Microfone não abre | Libere a permissão no cadeado; confirme que o endereço é `https://`. |
| “Não consegui te ouvir” sempre | Verifique internet (a escuta do Chrome usa o Google). Aproxime o tablet. Use “✅ Eu li” se persistir. |
| Gabi muda de voz ou some | Ajuste a voz em Pais → Ajustes. Instale uma voz pt-BR no Android. |
| Progresso sumiu | O progresso fica no armazenamento do site; limpar dados do Chrome apaga. Restaure o backup. |
| App abre desatualizado | Atualize o `VERSION` do `sw.js` **e** o `APP_VERSION` de `version.js`, publique de novo e feche/abra o app duas vezes. |

---

## Para quem for mexer no código

```powershell
node server/serve.mjs          # http://localhost:8080
node --test tests/*.test.mjs   # testes de lógica
node tests/smoke.mjs           # teste real no Chrome + prints
```

O app não tem build: é HTML/CSS/JS puro servido como arquivo estático. A lista de arquivos offline fica em `app/sw.js` — **ao criar um arquivo novo, adicione-o lá**.
