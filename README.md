# teste_exponenciacao — Projeção Hiperdimensional WebGL ($n^e$) & Voxel Video Player 3D

Visualizador 3D/hiperdimensional interativo de potências matemáticas desenvolvido em JavaScript modular (ES6+), Three.js (`InstancedMesh`) e Web Audio API, agora equipado com um **Player de Vídeo Voxel 3D** universal.

## Funcionalidades
- **Subdivisão Espacial Recursiva:** Projeta potências ($n^0, n^1, n^2, n^3, n^4, \dots$) por meio de cortes internos nos eixos $X, Y, Z$.
- **Renderização em GPU (`InstancedMesh`):** Suporta milhares de blocos simultâneos com modo **Espelho Infinito** automático para expoentes elevados.
- **Filtros Matemáticos:** Visualização de Esponja de Menger, constelação de índices primos e casca externa.
- **Inspeção Dimensional (Raycasting):** Hover sobre qualquer cubo exibe seu índice linear e coordenadas multidimensionais exatas.
- **Sintetizador Ambiente Procedural (`audio/`):** 7 trilhas generativas com osciladores Unison, delay estéreo e reatividade visual em tempo real na malha 3D.
- **Voxel Video Player 3D (`videoplayer/`):**
  - Reproduz qualquer vídeo (`MP4`, `WebM`, `MOV`) via seletor de arquivo ou **Drag & Drop** com o **áudio nativo do próprio vídeo** roteado por uma cadeia DSP Web Audio (`EQ`, `Cinema Hall 3D`, `Sub-Bass Boost`, `Espacial Stereo`, `Lo-Fi` + análise espectral FFT em tempo real).
  - **Extrusão 2.5D Colorida Universal:** Preserva cores reais (ou perfis `Vibrante HDR`, `Neon Synthwave`, `Alto Contraste P&B`) tanto na face frontal quanto nas paredes laterais extrudadas dos 6.912 cubos 3D, ajustando automaticamente a proporção (`16:9`, `4:3`, `9:16`, etc.).
  - **Fundo Panorâmico Vivo:** Domo esférico 360° reativo à textura, movimento e paleta de cores do vídeo, acompanhado por 720 cubos orbitais e anéis sincronizados.
  - **Câmera Cinematográfica com Mola Criticamente Amortecida:** 6 planos automáticos (`Órbita Espacial`, `Rasante Macro 3D`, `Contra-Zoom Vertigo`, `Pêndulo Lissajous`, `Imersão Frontal` e `Câmera Livre`).

- **Cubo Mágico Interativo $n^3$ (`rubiks/` — V2):**
  - Seção dedicada acessível pela página inicial (`🧩 Cubo Mágico (n³)`), isolando a interface aos controles originais de exponenciação (`Base n`, `Expoente e = 3` e `Corte / Vão`) para projetar cubos mágicos de $2\times2\times2$ até $8\times8\times8$.
  - **Interação Direta 3D & Teclado:** Arraste qualquer face do cubo diretamente com o mouse/toque para rotacionar a camada correspondente, ou use atalhos de notação (`U`, `D`, `L`, `R`, `F`, `B` + `Shift`) e botões rápidos.
  - **Embaralhar & Auto-Resolver:** Embaralhamento aleatório e algoritmo de auto-resolução com simplificação algébrica de movimentos, barra de progresso, feedback sonoro mecânico e animação de celebração.

- **Modo VR Imersivo WebXR (`vr/` — Meta Quest 2):**
  - Acessível pelo botão `🥽 Entrar em VR (Quest 2)` diretamente no navegador do headset (Oculus Browser via HTTPS ou `localhost`), sem dependências externas.
  - **Observatório 360° Anti-Flashbang (`vrWorldEnvironment.js`):** Domo estelar procedural com compressão Reinhard, piso de referência métrica e partículas reativas ao áudio.
  - **Rastreamento de Mãos & Gestos Naturais (`handTrackingEngine.js`):**
    - *Pinça com 1 mão:* Agarra, move e rotaciona o holograma em 6-DoF.
    - *Pinça com 2 mãos:* Redimensiona (de miniatura de mesa até escala de sala) e rotaciona a estrutura.
    - *Gesto "BOOM" com 2 mãos:* Juntar as mãos e afastá-las rapidamente detona ondas de choque na Física Sandbox ($F = ma$).
    - *Toque direto com o indicador:* Toca notas musicais espaciais nos cubos, gira camadas do Cubo Mágico e aciona controles 3D.
  - **Controles Holográficos Diegéticos 3D (`diegeticControls3D.js`):** Console de pulso/flutuante 100% 3D com abas para Potências ($n^e$), Rotação 4D & Física, Cubo Mágico ($n^3$) e Voxel Video 3D, substituindo janelas 2D durante a sessão VR.

## Como Executar Localmente
Como o projeto utiliza módulos ES6 (`import`), inicie um servidor HTTP simples na raiz do projeto:

```bash
python3 -m http.server 8000
```
