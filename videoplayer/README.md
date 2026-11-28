# Procedural Cinematic Director — movimento com intenção

Esta atualização tenta corrigir o problema de a câmera parecer uma demo de movimento 3D em vez de cinematografia.

## O que mudou
- O Auto-Diretor passa a escolher **uma intenção de movimento por tomada**, não uma pose fixa.
- Cada trajetória é construída continuamente e dura aproximadamente 10,5–18,5 segundos, dando tempo para o movimento ser percebido.
- Intenções: Dolly-In (aproximação), Dolly-Out (expansão), arco, travelling lateral, crane/revelação vertical, revelação em arco e plano contemplativo.
- A seleção pondera energia/movimento, batidas, escala do sujeito, profundidade, massa cromática/posição da cor e mudanças visuais.
- A câmera usa trajetórias com easing, lentes/FOV coerentes com a intenção, enquadramento guiado por saliência e springs críticos para suavizar transições.
- HUD mostra o movimento atual e a razão resumida da decisão.
- Evita empilhar movimentos contraditórios: cada tomada tem um verbo cinematográfico dominante, enquanto sinais do vídeo/audio modulam a escala e composição.

## Filosofia
A câmera não seleciona presets de posições. Os nomes são **intenções/gramática de movimento**; parâmetros como distância, azimute, elevação, deslocamento, alvo e FOV são gerados continuamente durante cada trajetória.

## Arquivos
- `cinematicCamera.js`: rig e diretor procedural.
- `videoDirector.js`: player, HUD e integração.
- `videoFrameAnalyzer.js`: telemetria de imagem/cor/profundidade.
- `videoAudioEngine.js`: análise musical.

## Validação
`node --check` executado nos quatro módulos; ZIP validado. Não houve teste visual de runtime no navegador nesta etapa.

## Referências de cinematografia consultadas
- [The camera as a verb — INEMA](https://inematds.github.io/formacao-cinema-ia-direcao-v72/en/aulas/camera/index.html): intenção do movimento (push, pull, follow, reveal, orbit) e evitar movimentos concorrentes numa tomada.
- [Cinematography — 3D Animation, Ohio State](https://u.osu.edu/animation/cinematography/): tracking, pan/tilt, crane e movimentos de câmera virtuais.
- [Cinematography: The Architect of the Gaze](https://pressbooks.pub/reframingcinema/chapter/cinematography-the-architect-of-the-gaze/): fundamentos dos movimentos físicos e revelação vertical.

## Correção de runtime (energyMix)
- Definida a mistura de energia musical (`energyMix`) no escopo de `update()`, com pesos para bass/mid/high/beatPulse e clamp 0–1.
- Campos ausentes do analyzer usam fallback 0. Corrige `ReferenceError: energyMix is not defined` que interrompia o loop de câmera.
- Revalidação: `node --check` dos quatro módulos e integridade ZIP; teste visual em browser ainda não realizado.
