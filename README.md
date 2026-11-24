# teste_exponenciacao# Projeção Hiperdimensional WebGL ($n^e$)

Visualizador 3D/hiperdimensional interativo de potências matemáticas desenvolvido em JavaScript modular (ES6+), Three.js (`InstancedMesh`) e Web Audio API.

## Funcionalidades
- **Subdivisão Espacial Recursiva:** Projeta potências ($n^0, n^1, n^2, n^3, n^4, \dots$) por meio de cortes internos nos eixos $X, Y, Z$.
- **Renderização em GPU (`InstancedMesh`):** Suporta milhares de blocos simultâneos com modo **Espelho Infinito** automático para expoentes elevados.
- **Filtros Matemáticos:** Visualização de Esponja de Menger, constelação de índices primos e casca externa.
- **Inspeção Dimensional (Raycasting):** Hover sobre qualquer cubo exibe seu índice linear e coordenadas multidimensionais exatas.
- **Sintetizador Ambiente Procedural (`audio/`):** 7 trilhas generativas com osciladores Unison, delay estéreo e reatividade visual em tempo real na malha 3D.

## Como Executar no Codespace / Localmente
Como o projeto utiliza módulos ES6 (`import`), inicie um servidor HTTP simples na raiz do projeto:

```bash
python3 -m http.server 8000