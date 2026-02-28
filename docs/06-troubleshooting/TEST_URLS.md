# URLs de Teste para Novas Plataformas

Este documento contém URLs reais de produtos para testar a captura de dados.

## Kabum

### Mouse Gamer
https://www.kabum.com.br/produto/113599/mouse-gamer-logitech-g203-rgb-lightsync-6-botoes-8000-dpi-branco-910-005791

### Teclado Mecânico
https://www.kabum.com.br/produto/112992/teclado-mecanico-gamer-redragon-kumara-rgb-switch-outemu-blue-abnt2-preto-k552rgb-2-pt-blue

### Headset Gamer
https://www.kabum.com.br/produto/85215/headset-gamer-hyperx-cloud-stinger-core-drivers-40mm-preto-e-azul-ps4-4p5l7aa

### SSD
https://www.kabum.com.br/produto/85198/ssd-kingston-a400-480gb-sata-iii-leitura-500mb-s-escrita-450mb-s-sa400s37-480g

## Magazine Luiza

### Notebook
https://www.magazineluiza.com.br/notebook-gamer-lenovo-ideapad-gaming-3i-intel-core-i5-11300h-8gb-512gb-ssd-nvidia-geforce-gtx-1650-15-6-full-hd-linux/p/235792500/in/note/

### Smartphone
https://www.magazineluiza.com.br/smartphone-samsung-galaxy-a14-128gb-preto-4g-octa-core-4gb-ram-6-6-cam-tripla-selfie-13mp/p/237106400/te/galx/

### Smart TV
https://www.magazineluiza.com.br/smart-tv-50-4k-uhd-led-samsung-50cu7700-processador-crystal-4k-tela-sem-limites-visual-livre-de-cabos-alexa-built-in-3-hdmi/p/237633800/et/tlsm/

### Ar Condicionado
https://www.magazineluiza.com.br/ar-condicionado-split-hw-inverter-midea-liva-9000-btus-so-frio-220v-42mlca09m5/p/kh4418fg7e/ar/arcn/

## Terabyteshop

### Placa de Vídeo
https://www.terabyteshop.com.br/produto/21985/placa-de-video-gainward-geforce-rtx-3060-ghost-12gb-gddr6-192-bit-ne63060019k9-190au

### Processador
https://www.terabyteshop.com.br/produto/18594/processador-amd-ryzen-5-5600g-39-ghz-44ghz-turbo-6-cores-12-threads-cooler-wraith-stealth-am4

### Memória RAM
https://www.terabyteshop.com.br/produto/11658/memoria-ddr4-xpg-gammix-d30-8gb-3200mhz-black-ax4u320038g16a-sb30

### SSD NVMe
https://www.terabyteshop.com.br/produto/19039/ssd-kingston-nv2-500gb-m2-nvme-2280-leitura-3500mbs-e-gravacao-2100mbs-snv2s500g

---

## Como usar

1. Execute o script de teste:
```bash
cd backend
node scripts/test-new-platforms.js
```

2. O script irá:
   - Testar cada URL
   - Validar os dados extraídos
   - Reportar erros
   - Sugerir correções

3. Se houver erros, revise:
   - Seletores CSS nos métodos de extração
   - Headers HTTP
   - Tratamento de erros
