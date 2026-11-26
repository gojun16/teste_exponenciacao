export const CURIOSITIES = [
  // =========================================================================
  // 1. FUNDAMENTOS & PARADOXOS (18)
  // =========================================================================
  {
    category: 'Fundamentos & Paradoxos',
    title: 'O Núcleo Adimensional',
    formula: 'b⁰ = 1',
    focus: 'center',
    text: 'Qualquer número diferente de zero elevado a 0 resulta em 1. Antes de existir comprimento, área ou volume, toda potência nasce de uma unidade indivisível.',
    visualCue: 'A mira aponta para o bloco único na origem: com expoente 0, nenhuma subdivisão nos eixos X, Y ou Z foi criada ainda.',
    pace: 'calm',
    duration: 14,
    setup: { base: 3, exp: 0, filter: 'all', explode: 0, slice: 1, zCurve: false, scanner: false, tuning: 'harmonic', camera: { radius: 14, speed: 0.24 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'A Primeira Dimensão Linear',
    formula: '5¹ = 5',
    focus: 'corner',
    text: 'Com expoente 1, a potência abandona o ponto e estende-se em uma única linha reta com 5 segmentos alinhados em um único eixo.',
    visualCue: 'Observe o alinhamento unidimensional dos 5 blocos formando a primeira aresta fundamental da base 5.',
    pace: 'calm',
    duration: 13,
    setup: { base: 5, exp: 1, filter: 'all', explode: 0.28, slice: 1, zCurve: true, scanner: false, tuning: 'edo', camera: { radius: 15, speed: 0.22 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'O Plano Bidimensional Quadrado',
    formula: '6² = 36',
    focus: 'corner',
    text: 'Ao elevar uma base ao quadrado, multiplicamos duas direções perpendiculares e geramos área — a mesma razão pela qual medimos terrenos em metros quadrados.',
    visualCue: 'Veja a malha plana 6×6 = 36 unidades estendida sem profundidade vertical.',
    pace: 'geometric',
    duration: 13,
    setup: { base: 6, exp: 2, filter: 'all', explode: 0.22, slice: 1, zCurve: false, scanner: true, tuning: 'pythagorean', camera: { radius: 17, speed: 0.20 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'O Salto para o Volume Cúbico',
    formula: '4³ = 64',
    focus: 'corner',
    text: 'No expoente 3, a base conquista profundidade e preenche o espaço tridimensional. Um cubo de lado 4 já contém 64 unidades volumétricas.',
    visualCue: 'Acompanhe o bloco externo do cubo 4×4×4 = 64 expandido suavemente para revelar suas camadas internas.',
    pace: 'geometric',
    duration: 14,
    setup: { base: 4, exp: 3, filter: 'all', explode: 0.30, slice: 1, zCurve: false, scanner: false, tuning: 'edo', camera: { radius: 19, speed: 0.19 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'O Tabuleiro de Trigo de Sissa',
    formula: '2⁶ = 64',
    focus: 'zcurve',
    text: 'Na lenda do xadrez, dobrar os grãos de trigo a cada casa parecia modesto no início. Em 6 casas temos 64 grãos — e na 64ª ultrapassamos 18 quintilhões.',
    visualCue: 'Acompanhe a Curva Z dourada percorrendo as 64 subdivisões da potência binária 2⁶.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 2, exp: 6, filter: 'all', explode: 0.24, slice: 1, zCurve: true, scanner: false, tuning: 'edo', camera: { radius: 21, speed: 0.19 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'O Paradoxo da Folha Dobrada',
    formula: '2⁷ = 128',
    focus: 'corner',
    text: 'Dobrar uma folha de papel 7 vezes multiplica sua espessura por 128. Com 42 dobras exponenciais, a pilha alcançaria os 384.400 km até a Lua.',
    visualCue: 'Observe o Scanner Laser varrendo as camadas de 2⁷ = 128 e convertendo cada nível em notas musicais.',
    pace: 'calm',
    duration: 15,
    setup: { base: 2, exp: 7, filter: 'all', explode: 0.30, slice: 0.88, zCurve: false, scanner: true, tuning: 'edo', camera: { radius: 22, speed: 0.17 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'Por Que Potências Não Comutam',
    formula: '2³ ≠ 3² (8 vs 9)',
    focus: 'center',
    text: 'Enquanto 2 × 3 é igual a 3 × 2, na exponenciação inverter base e expoente muda o resultado: 2³ vale 8, mas 3² vale 9. Apenas 2⁴ e 4² empatam em 16.',
    visualCue: 'Veja o bloco central dentro do quadrado 3² = 9, uma unidade maior que o cubo binário 2³ = 8.',
    pace: 'calm',
    duration: 14,
    setup: { base: 3, exp: 2, filter: 'all', explode: 0.35, slice: 1, zCurve: true, scanner: false, tuning: 'pythagorean', camera: { radius: 15, speed: 0.22 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'O Empate Único de Euler',
    formula: '2⁴ = 4² = 16',
    focus: 'corner',
    text: 'Entre todos os números inteiros positivos distintos, 2 e 4 são os únicos que satisfazem aᵇ = bᵃ: tanto 2⁴ quanto 4² resultam exatamente em 16 blocos.',
    visualCue: 'Observe os 16 blocos organizados como projeção 4D binária (2⁴) rotacionando suavemente.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 2, exp: 4, filter: 'all', explode: 0.38, slice: 1, rotXW: 30, rotYW: 20, autoSpin4D: true, tuning: 'harmonic', camera: { radius: 18, speed: 0.17 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'O Nenúfar na Lagoa',
    formula: '2⁹ = 512',
    focus: 'slice',
    text: 'Se uma planta dobra de área todo dia e cobre o lago inteiro no 10º dia, quando ela cobria metade do lago? No 9º dia — o último passo sempre guarda metade do total.',
    visualCue: 'Note como 2⁹ = 512 representa exatamente a metade estrutural antes do salto final para 2¹⁰ = 1.024.',
    pace: 'calm',
    duration: 15,
    setup: { base: 2, exp: 9, filter: 'all', explode: 0.18, slice: 0.82, zCurve: false, scanner: true, tuning: 'edo', camera: { radius: 23, speed: 0.16 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'A Base Neperiana de Euler (e)',
    formula: 'e ≈ 2,71828...',
    focus: 'center',
    text: 'Entre 2 e 3 reside o número e ≈ 2,718, a única base cuja taxa de crescimento em cada instante é exatamente igual ao seu próprio valor acumulado.',
    visualCue: 'A estrutura ternária 3³ = 27 aproxima geometricamente a base inteira mais próxima da constante e.',
    pace: 'calm',
    duration: 14,
    setup: { base: 3, exp: 3, filter: 'all', explode: 0.34, slice: 1, zCurve: true, scanner: false, tuning: 'harmonic', camera: { radius: 18, speed: 0.20 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'O Mito da Linearidade Humana',
    formula: '5⁴ = 625',
    focus: 'corner',
    text: 'Nosso cérebro intui somas lineares com facilidade, mas subestima potências: dar 4 passos multiplicando por 5 já produz 625 unidades em vez de 20.',
    visualCue: 'Veja a densidade das 625 unidades formadas por apenas quatro multiplicações sucessivas de 5.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 5, exp: 4, filter: 'all', explode: 0.16, slice: 0.85, zCurve: false, scanner: false, tuning: 'edo', camera: { radius: 24, speed: 0.16 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'Invariância da Base Unitária',
    formula: '1ⁿ = 1',
    focus: 'center',
    text: 'Elevar o número 1 a qualquer expoente — 10, 1.000 ou um milhão — nunca sai do lugar. Sem fator maior que 1, a dimensão cresce no papel mas não multiplica volume.',
    visualCue: 'Mesmo com expoente 5, a base 1 mantém um único bloco imóvel no centro do universo.',
    pace: 'calm',
    duration: 13,
    setup: { base: 1, exp: 5, filter: 'all', explode: 0, slice: 1, zCurve: false, scanner: true, tuning: 'harmonic', camera: { radius: 13, speed: 0.25 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'Soma dos Cubos Consecutivos',
    formula: '1³ + 2³ + 3³ = 36 = 6²',
    focus: 'corner',
    text: 'Uma joia da álgebra: a soma dos cubos dos n primeiros inteiros é sempre igual ao quadrado da soma deles. 1 + 8 + 27 resulta exatamente em 36.',
    visualCue: 'Observe os 36 blocos de 6² organizados em simetria plana perfeita.',
    pace: 'calm',
    duration: 14,
    setup: { base: 6, exp: 2, filter: 'all', explode: 0.30, slice: 1, zCurve: true, scanner: false, tuning: 'pythagorean', camera: { radius: 17, speed: 0.20 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'Juros Compostos de Einstein',
    formula: '2⁸ = 256',
    focus: 'corner',
    text: 'Nos juros compostos, o rendimento passa a render sobre si mesmo. Após 8 ciclos de duplicação, o capital inicial multiplica-se por 256 vezes.',
    visualCue: 'Acompanhe o Scanner Laser percorrendo as camadas acumuladas da potência 2⁸ = 256.',
    pace: 'geometric',
    duration: 14,
    setup: { base: 2, exp: 8, filter: 'all', explode: 0.24, slice: 1, zCurve: false, scanner: true, tuning: 'edo', camera: { radius: 22, speed: 0.17 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'A Escala Logarítmica Inversa',
    formula: 'log₁₀(1000) = 3',
    focus: 'slice',
    text: 'O logaritmo responde à pergunta oposta da potência: quantas vezes precisamos multiplicar a base 10 para alcançar 1.000? Exatamente 3 dimensões.',
    visualCue: 'Veja as 3 dimensões espaciais (X, Y e Z) empilhando 1.000 blocos na grade decimal 10³.',
    pace: 'calm',
    duration: 14,
    setup: { base: 10, exp: 3, filter: 'all', explode: 0.12, slice: 0.75, zCurve: false, scanner: false, tuning: 'edo', camera: { radius: 24, speed: 0.16 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'Torres de Potências (Tetração)',
    formula: '3^(3¹) = 3³ = 27',
    focus: 'center',
    text: 'Quando empilhamos expoentes um sobre o outro (tetração), os valores explodem além da escala cósmica: 3³ vale 27, mas 3^(3³) já tem 13 dígitos.',
    visualCue: 'A mira marca o núcleo dos 27 blocos que formam apenas o segundo degrau da torre de base 3.',
    pace: 'geometric',
    duration: 14,
    setup: { base: 3, exp: 3, filter: 'all', explode: 0.42, slice: 1, zCurve: false, scanner: true, tuning: 'harmonic', camera: { radius: 18, speed: 0.21 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'Padrão Cíclico dos Últimos Dígitos',
    formula: '7¹=7, 7²=49, 7³=343',
    focus: 'slice',
    text: 'As potências de 7 terminam sempre no ciclo repetitivo 7, 9, 3, 1. A aritmética modular revela ordem oculta mesmo em números gigantescos.',
    visualCue: 'Observe o corte interno da estrutura 7³ = 343 unidades organizadas em simetria setenária.',
    pace: 'calm',
    duration: 14,
    setup: { base: 7, exp: 3, filter: 'all', explode: 0.14, slice: 0.76, zCurve: false, scanner: false, tuning: 'pythagorean', camera: { radius: 23, speed: 0.16 } }
  },
  {
    category: 'Fundamentos & Paradoxos',
    title: 'A Soma das Potências de Dois',
    formula: '1 + 2 + 4 + 8 + 16 = 2⁵ - 1',
    focus: 'zcurve',
    text: 'Somar todas as potências de 2 até 2ⁿ⁻¹ resulta sempre na próxima potência menos 1. Cada novo degrau supera tudo o que veio antes somado.',
    visualCue: 'Siga a Curva Z conectando os 32 blocos de 2⁵ — um a mais que a soma de todas as camadas anteriores.',
    pace: 'geometric',
    duration: 14,
    setup: { base: 2, exp: 5, filter: 'all', explode: 0.32, slice: 1, zCurve: true, scanner: false, tuning: 'edo', camera: { radius: 19, speed: 0.21 } }
  },

  // =========================================================================
  // 2. COMPUTAÇÃO & BITS (18)
  // =========================================================================
  {
    category: 'Computação & Bits',
    title: 'O Bit: A Menor Escolha Possível',
    formula: '2¹ = 2',
    focus: 'corner',
    text: 'Claude Shannon demonstrou que toda informação digital se reduz a escolhas binárias (0 ou 1). Um único bit divide o universo em 2 estados.',
    visualCue: 'Observe os 2 blocos fundamentais representando ligado e desligado no eixo primário.',
    pace: 'calm',
    duration: 13,
    setup: { base: 2, exp: 1, filter: 'all', explode: 0.35, slice: 1, zCurve: true, scanner: true, tuning: 'edo', camera: { radius: 14, speed: 0.24 } }
  },
  {
    category: 'Computação & Bits',
    title: 'O Nibble e o Sistema Hexadecimal',
    formula: '2⁴ = 16',
    focus: 'corner',
    text: 'Quatro bits agrupados formam um nibble com 16 combinações (0 a 9 e A a F) — a base hexadecimal usada para compactar endereços de memória.',
    visualCue: 'Acompanhe os 16 blocos de 2⁴ girando na projeção quadridimensional com acompanhamento musical.',
    pace: 'geometric',
    duration: 14,
    setup: { base: 2, exp: 4, filter: 'all', explode: 0.40, slice: 1, rotXW: 40, rotYW: 25, autoSpin4D: true, scanner: true, tuning: 'edo', camera: { radius: 19, speed: 0.16 } }
  },
  {
    category: 'Computação & Bits',
    title: 'O Universo de Um Único Byte',
    formula: '2⁸ = 256',
    focus: 'corner',
    text: 'Com 8 bits ligados ou desligados, um único byte codifica 256 estados distintos — de 0 a 255 em cada canal de cor RGB dos pixels desta tela.',
    visualCue: 'Note o espaçamento hierárquico revelando os sub-octantes que compõem as 256 combinações de 8 bits.',
    pace: 'geometric',
    duration: 14,
    setup: { base: 2, exp: 8, filter: 'all', explode: 0.30, slice: 0.92, zCurve: false, scanner: false, tuning: 'edo', camera: { radius: 22, speed: 0.18 } }
  },
  {
    category: 'Computação & Bits',
    title: 'O Salto do Kilobyte Binário',
    formula: '2¹⁰ = 1.024',
    focus: 'corner',
    text: 'Dez subdivisões binárias transformam 1 bloco em 1.024 unidades — a razão histórica pela qual 1 KB na memória equivale a 1.024 bytes e não 1.000.',
    visualCue: 'Veja a alta densidade dos 1.024 micro-blocos agrupados na grade binária enquanto o laser percorre o volume.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 2, exp: 10, filter: 'all', explode: 0.16, slice: 1, zCurve: false, scanner: true, tuning: 'edo', camera: { radius: 24, speed: 0.15 } }
  },
  {
    category: 'Computação & Bits',
    title: 'O Labirinto da Curva Z de Morton',
    formula: '2⁶ → Ordem Z',
    focus: 'zcurve',
    text: 'Como a memória RAM é uma fita linear (1D), placas de vídeo usam a Curva Z para endereçar texturas 3D vizinhas sem perder performance de cache.',
    visualCue: 'Com os cubos ocultos, o ponteiro acompanha a dobra fractal da Curva Z conectando todas as 64 coordenadas.',
    pace: 'calm',
    duration: 15,
    setup: { base: 2, exp: 6, cubesVisible: false, zCurve: true, explode: 0.14, slice: 1, tuning: 'pythagorean', camera: { radius: 20, speed: 0.22 } }
  },
  {
    category: 'Computação & Bits',
    title: 'Árvores Octree em Jogos 3D',
    formula: '8³ = 512',
    focus: 'slice',
    text: 'Motores gráficos dividem o espaço 3D recursivamente em 8 octantes (2³) para detectar colisões e renderizar apenas o que está no campo de visão.',
    visualCue: 'Observe a subdivisão em 8×8×8 = 512 células cúbicas cortadas transversalmente para expor o interior.',
    pace: 'geometric',
    duration: 14,
    setup: { base: 8, exp: 3, filter: 'all', explode: 0.15, slice: 0.72, zCurve: false, scanner: false, tuning: 'edo', camera: { radius: 23, speed: 0.17 } }
  },
  {
    category: 'Computação & Bits',
    title: 'Cores True Color de 24 Bits',
    formula: '2²⁴ = 16.777.216',
    focus: 'corner',
    text: 'Três bytes juntos (vermelho, verde e azul) geram 256³ = 16,7 milhões de cores — mais tonalidades do que o olho humano consegue distinguir.',
    visualCue: 'Cada sub-região do cubo 6³ = 216 funciona como um espaço de cores tridimensional R, G e B.',
    pace: 'calm',
    duration: 14,
    setup: { base: 6, exp: 3, filter: 'all', explode: 0.22, slice: 1, zCurve: false, scanner: true, tuning: 'harmonic', camera: { radius: 21, speed: 0.18 } }
  },
  {
    category: 'Computação & Bits',
    title: 'Lógica Ternária Balanceada',
    formula: '3³ = 27 trits',
    focus: 'center',
    text: 'Nos anos 1950, o computador soviético Setun usou base 3 (-1, 0, +1) em vez de bits. Três trits já codificam 27 valores com simetria natural.',
    visualCue: 'A mira aponta para o estado neutro central (0,0,0) cercado pelos 26 estados positivos e negativos de 3³.',
    pace: 'calm',
    duration: 14,
    setup: { base: 3, exp: 3, filter: 'all', explode: 0.40, slice: 1, zCurve: true, scanner: false, tuning: 'pythagorean', camera: { radius: 18, speed: 0.21 } }
  },
  {
    category: 'Computação & Bits',
    title: 'Endereçamento IPv4 vs IPv6',
    formula: '2³² vs 2¹²⁸',
    focus: 'corner',
    text: 'O protocolo IPv4 esgotou seus 4,3 bilhões de endereços (2³²). O IPv6 resolveu o problema com 2¹²⁸ combinações — trilhões de IPs por metro quadrado da Terra.',
    visualCue: 'Acompanhe o Scanner Laser percorrendo a malha 2⁸ = 256, que equivale a apenas um único octeto de um endereço IP.',
    pace: 'geometric',
    duration: 14,
    setup: { base: 2, exp: 8, filter: 'all', explode: 0.20, slice: 1, zCurve: false, scanner: true, tuning: 'edo', camera: { radius: 22, speed: 0.17 } }
  },
  {
    category: 'Computação & Bits',
    title: 'A Lei de Moore em Silício',
    formula: '2⁹ = 512',
    focus: 'corner',
    text: 'Por décadas, a densidade de transistores em microchips dobrou aproximadamente a cada 2 anos, transformando computadores de salas inteiras em relógios de pulso.',
    visualCue: 'Veja os 512 blocos de 2⁹ empilhados em alta densidade representando gerações sucessivas de miniaturização.',
    pace: 'calm',
    duration: 14,
    setup: { base: 2, exp: 9, filter: 'all', explode: 0.14, slice: 0.90, zCurve: false, scanner: false, tuning: 'edo', camera: { radius: 23, speed: 0.16 } }
  },
  {
    category: 'Computação & Bits',
    title: 'A Barreira da Criptografia AES-256',
    formula: '2²⁵⁶ chaves',
    focus: 'corner',
    text: 'Testar todas as 2²⁵⁶ chaves de criptografia AES exigiria mais energia do que toda a produzida pelo Sol durante bilhões de anos.',
    visualCue: 'A estrutura quadridimensional 4⁴ = 256 ilustra apenas o número de bits de uma única chave moderna.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 4, exp: 4, filter: 'all', explode: 0.28, slice: 1, rotXW: 35, rotYW: 25, autoSpin4D: true, tuning: 'pythagorean', camera: { radius: 22, speed: 0.15 } }
  },
  {
    category: 'Computação & Bits',
    title: 'Busca Binária: Cortando ao Meio',
    formula: 'log₂(1.024) = 10 passos',
    focus: 'slice',
    text: 'Para achar 1 item entre 1.024 ordenados, a busca binária descarta metade da lista a cada pergunta e encontra a resposta em no máximo 10 tentativas.',
    visualCue: 'Observe o corte na estrutura 2¹⁰ = 1.024 reduzindo o espaço de busca em frações exatas.',
    pace: 'calm',
    duration: 14,
    setup: { base: 2, exp: 10, filter: 'all', explode: 0.15, slice: 0.50, zCurve: false, scanner: false, tuning: 'edo', camera: { radius: 23, speed: 0.17 } }
  },
  {
    category: 'Computação & Bits',
    title: 'Voxels e Mundos Procedurais',
    formula: '9³ = 729',
    focus: 'slice',
    text: 'Cada cubo neste motor é um voxel (pixel volumétrico). Mundos infinitos em jogos são gerados em chunks cúbicos usando funções matemáticas determinísticas.',
    visualCue: 'Veja o interior do chunk 9×9×9 = 729 voxels revelado pelo plano de corte transversal.',
    pace: 'geometric',
    duration: 14,
    setup: { base: 9, exp: 3, filter: 'all', explode: 0.12, slice: 0.68, zCurve: false, scanner: false, tuning: 'harmonic', camera: { radius: 24, speed: 0.16 } }
  },
  {
    category: 'Computação & Bits',
    title: 'Códigos QR e Correção Reed-Solomon',
    formula: '2⁵ = 32 módulos',
    focus: 'zcurve',
    text: 'Os quadradinhos de um QR Code organizam bits em matrizes binárias com redundância exponencial, permitindo leitura mesmo com 30% do código rasgado.',
    visualCue: 'Acompanhe a ordem de leitura da Curva Z varrendo os 32 módulos da estrutura 2⁵.',
    pace: 'calm',
    duration: 14,
    setup: { base: 2, exp: 5, filter: 'all', explode: 0.28, slice: 1, zCurve: true, scanner: true, tuning: 'edo', camera: { radius: 19, speed: 0.21 } }
  },
  {
    category: 'Computação & Bits',
    title: 'Qubits e Superposição Quântica',
    formula: '2ⁿ estados simultâneos',
    focus: 'corner',
    text: 'Enquanto n bits clássicos guardam um único número por vez, n qubits em superposição manipulam amplitudes para todos os 2ⁿ estados simultaneamente.',
    visualCue: 'Observe os 64 estados de 2⁶ rotacionando em 4 dimensões enquanto o laser toca acordes simultâneos.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 2, exp: 6, filter: 'all', explode: 0.34, slice: 1, rotXW: 50, rotYW: 35, autoSpin4D: true, scanner: true, tuning: 'harmonic', camera: { radius: 21, speed: 0.16 } }
  },
  {
    category: 'Computação & Bits',
    title: 'Ponto Flutuante IEEE 754',
    formula: '(-1)ˢ × mantissa × 2ᵉ',
    focus: 'center',
    text: 'Computadores representam desde átomos até galáxias usando notação científica binária: um campo guarda os dígitos e outro guarda o expoente de 2.',
    visualCue: 'Veja a hierarquia de escalas dentro da estrutura 2⁷ = 128 blocos.',
    pace: 'calm',
    duration: 14,
    setup: { base: 2, exp: 7, filter: 'all', explode: 0.26, slice: 1, zCurve: false, scanner: false, tuning: 'edo', camera: { radius: 21, speed: 0.18 } }
  },
  {
    category: 'Computação & Bits',
    title: 'Compilação e Complexidade O(2ⁿ)',
    formula: '3⁵ = 243 caminhos',
    focus: 'corner',
    text: 'Algoritmos de força bruta com complexidade exponencial O(bⁿ) tornam-se intratáveis rapidamente, motivando heurísticas inteligentes e programação dinâmica.',
    visualCue: 'Observe os 243 estados da árvore de decisão ternária 3⁵ expandidos no espaço.',
    pace: 'geometric',
    duration: 14,
    setup: { base: 3, exp: 5, filter: 'all', explode: 0.24, slice: 0.86, zCurve: false, scanner: false, tuning: 'pythagorean', camera: { radius: 23, speed: 0.17 } }
  },
  {
    category: 'Computação & Bits',
    title: 'Áudio Digital PCM de 16 Bits',
    formula: '2¹⁶ = 65.536 níveis',
    focus: 'corner',
    text: 'A qualidade de CD digitaliza ondas sonoras em 65.536 degraus de amplitude (2¹⁶) 44.100 vezes por segundo para reconstruir timbres acústicos puros.',
    visualCue: 'Ouça a sinfonia sintetizada enquanto o Scanner Laser varre os níveis harmônicos da estrutura 4³.',
    pace: 'calm',
    duration: 14,
    setup: { base: 4, exp: 3, filter: 'all', explode: 0.26, slice: 1, zCurve: false, scanner: true, tuning: 'harmonic', camera: { radius: 19, speed: 0.18 } }
  },

  // =========================================================================
  // 3. GEOMETRIA 4D & HIPERESPAÇO (18)
  // =========================================================================
  {
    category: 'Geometria 4D',
    title: 'A Sombra de um Tesseract',
    formula: '3⁴ = 81',
    focus: 'corner',
    text: 'Assim como um cubo 3D projeta uma sombra plana 2D, os 81 blocos aqui representam um hipercubo 3×3×3×3 rotacionando nos planos quadridimensionais XW e YW.',
    visualCue: 'Acompanhe o vértice marcado atravessando o interior durante a rotação 4D: é a projeção da 4ª coordenada (W).',
    pace: 'geometric',
    duration: 16,
    setup: { base: 3, exp: 4, filter: 'all', explode: 0.35, slice: 0.85, rotXW: 45, rotYW: 30, autoSpin4D: true, tuning: 'harmonic', camera: { radius: 21, speed: 0.14 } }
  },
  {
    category: 'Geometria 4D',
    title: 'O Hipercubo Unitário Clássico',
    formula: '2⁴ = 16',
    focus: 'corner',
    text: 'Um tesseract possui 16 vértices, 32 arestas, 24 faces quadradas e 8 células cúbicas. Ao girar no eixo W, o núcleo interno vira do avesso para o exterior.',
    visualCue: 'Siga um dos 16 vértices do hipercubo 2⁴ orbitando entre a célula interna e a externa enquanto o laser toca harmônicos.',
    pace: 'calm',
    duration: 16,
    setup: { base: 2, exp: 4, filter: 'all', explode: 0.48, slice: 1, rotXW: 60, rotYW: 45, autoSpin4D: true, scanner: true, tuning: 'harmonic', camera: { radius: 19, speed: 0.14 } }
  },
  {
    category: 'Geometria 4D',
    title: 'Corte Transversal em 4 Dimensões',
    formula: '4⁴ = 256',
    focus: 'slice',
    text: 'Fatiar uma estrutura quadridimensional revela como sub-cubos inteiros surgem e desaparecem conforme o hiperplano de corte desliza pelo hiperespaço.',
    visualCue: 'O ponteiro indica a borda do corte transversal (Slice) expondo o miolo da estrutura 4⁴ = 256 em rotação 4D.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 4, exp: 4, filter: 'all', explode: 0.24, slice: 0.58, rotXW: 35, rotYW: -25, autoSpin4D: true, tuning: 'pythagorean', camera: { radius: 23, speed: 0.15 } }
  },
  {
    category: 'Geometria 4D',
    title: 'O Penteracto: A 5ª Dimensão',
    formula: '2⁵ = 32 vértices',
    focus: 'corner',
    text: 'Subindo mais um degrau na base 2, o penteracto (hipercubo 5D) possui 32 vértices, 80 arestas e 10 células tesserácticas entrelaçadas.',
    visualCue: 'Observe os 32 vértices da projeção 5D dobrando-se sobre si mesmos durante a rotação hiperdimensional.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 2, exp: 5, filter: 'all', explode: 0.42, slice: 1, rotXW: 50, rotYW: 40, autoSpin4D: true, tuning: 'harmonic', camera: { radius: 20, speed: 0.15 } }
  },
  {
    category: 'Geometria 4D',
    title: 'O Hexeracto em 6 Dimensões',
    formula: '2⁶ = 64 vértices',
    focus: 'corner',
    text: 'Cada nova dimensão dobra o número de vértices de um hipercubo. Na 6ª dimensão, 64 vértices formam uma malha simétrica de 192 arestas.',
    visualCue: 'Veja os 64 vértices binários entrelaçando-se em múltiplas camadas concêntricas.',
    pace: 'calm',
    duration: 15,
    setup: { base: 2, exp: 6, filter: 'all', explode: 0.34, slice: 1, rotXW: 40, rotYW: 55, autoSpin4D: true, scanner: false, tuning: 'edo', camera: { radius: 22, speed: 0.15 } }
  },
  {
    category: 'Geometria 4D',
    title: 'Planos de Rotação XW e YW',
    formula: '3⁴ = 81',
    focus: 'center',
    text: 'Em 3D giramos em torno de uma linha (eixo). Em 4D giramos em torno de um plano inteiro, permitindo rotações duplas simultâneas nos planos XW e YW.',
    visualCue: 'Note o núcleo central permanecendo ancorado enquanto as camadas externas giram em torno do plano W.',
    pace: 'calm',
    duration: 15,
    setup: { base: 3, exp: 4, filter: 'all', explode: 0.30, slice: 1, rotXW: 75, rotYW: 15, autoSpin4D: true, scanner: true, tuning: 'harmonic', camera: { radius: 21, speed: 0.14 } }
  },
  {
    category: 'Geometria 4D',
    title: 'Por Que Nenhuma Prisão 3D Segura em 4D',
    formula: '3⁴ = 81 (Corte)',
    focus: 'slice',
    text: 'Um ser 3D escapa de um quadrado 2D saltando pelo eixo Z. Da mesma forma, um ser 4D sairia de um cofre 3D fechado movendo-se pela direção W.',
    visualCue: 'Com o corte em 65%, observe o interior totalmente exposto da estrutura 4D sem romper suas paredes 3D.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 3, exp: 4, filter: 'all', explode: 0.28, slice: 0.65, rotXW: 30, rotYW: 30, autoSpin4D: true, tuning: 'pythagorean', camera: { radius: 21, speed: 0.16 } }
  },
  {
    category: 'Geometria 4D',
    title: 'Nós Impossíveis Desfeitos em 4D',
    formula: '2⁵ → Curva Z 4D',
    focus: 'zcurve',
    text: 'Na topologia matemática, qualquer nó fechado feito em um barbante 3D pode ser desatado sem cortes se puder ser movido na 4ª dimensão.',
    visualCue: 'Veja a linha contínua da Curva Z atravessando o espaço sem nunca colidir consigo mesma na projeção 4D.',
    pace: 'calm',
    duration: 15,
    setup: { base: 2, exp: 5, cubesVisible: false, zCurve: true, explode: 0.32, slice: 1, rotXW: 45, rotYW: 35, autoSpin4D: true, tuning: 'harmonic', camera: { radius: 20, speed: 0.16 } }
  },
  {
    category: 'Geometria 4D',
    title: 'A Fórmula Geral dos Vértices',
    formula: 'V = 2ᵈ',
    focus: 'corner',
    text: 'Um ponto (0D) tem 2⁰ = 1 vértice; um segmento (1D) tem 2¹ = 2; um quadrado (2D) tem 2² = 4; um cubo (3D) tem 2³ = 8; um tesseract (4D) tem 2⁴ = 16.',
    visualCue: 'A mira marca um dos 16 vértices fundamentais que definem a envoltória externa do tesseract.',
    pace: 'calm',
    duration: 14,
    setup: { base: 2, exp: 4, filter: 'all', explode: 0.45, slice: 1, rotXW: 25, rotYW: 50, autoSpin4D: true, tuning: 'edo', camera: { radius: 19, speed: 0.16 } }
  },
  {
    category: 'Geometria 4D',
    title: 'Perspectiva Estereográfica 4D → 3D',
    formula: '4⁴ = 256',
    focus: 'corner',
    text: 'Assim como objetos distantes parecem menores em uma foto 2D, blocos com coordenada W maior encolhem suavemente na projeção em perspectiva 4D.',
    visualCue: 'Repare na diferença de escala aparente entre os blocos próximos e os afastados no eixo W.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 4, exp: 4, filter: 'all', explode: 0.32, slice: 1, rotXW: 55, rotYW: 20, autoSpin4D: true, tuning: 'harmonic', camera: { radius: 24, speed: 0.14 } }
  },
  {
    category: 'Geometria 4D',
    title: 'A 7ª Dimensão: O Hepteracto',
    formula: '2⁷ = 128 vértices',
    focus: 'corner',
    text: 'Um hipercubo de 7 dimensões possui 128 vértices, 448 arestas e 14 células hexerácticas — estrutura usada em códigos corretores de erro de satélites.',
    visualCue: 'Observe a nuvem simétrica dos 128 vértices rotacionando em harmonia espacial.',
    pace: 'calm',
    duration: 15,
    setup: { base: 2, exp: 7, filter: 'all', explode: 0.30, slice: 1, rotXW: 35, rotYW: 40, autoSpin4D: true, scanner: true, tuning: 'edo', camera: { radius: 23, speed: 0.15 } }
  },
  {
    category: 'Geometria 4D',
    title: 'Fibrado de Hopf e Simetria Circular',
    formula: '3⁴ = 81',
    focus: 'zcurve',
    text: 'Na geometria de 4 dimensões, círculos podem entrelaçar-se como elos de uma corrente sem jamais se tocarem — a base matemática do Fibrado de Hopf.',
    visualCue: 'Acompanhe o traçado contínuo conectando os 81 pontos do hipercubo 3⁴ em rotação.',
    pace: 'calm',
    duration: 15,
    setup: { base: 3, exp: 4, filter: 'all', explode: 0.30, slice: 1, zCurve: true, rotXW: 40, rotYW: 40, autoSpin4D: true, tuning: 'harmonic', camera: { radius: 21, speed: 0.15 } }
  },
  {
    category: 'Geometria 4D',
    title: 'O Enigma do Cubo Mágico 4D',
    formula: '3⁴ = 81 hiper-peças',
    focus: 'corner',
    text: 'Enquanto o Cubo de Rubik 3D tem 27 peças, sua versão quadridimensional (3⁴) possui 81 hiper-peças e mais de 1,7 × 10¹²⁰ embaralhamentos possíveis.',
    visualCue: 'Veja as 81 hiper-peças separadas pelo Explode enquanto giram no espaço 4D.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 3, exp: 4, filter: 'all', explode: 0.42, slice: 1, rotXW: 20, rotYW: 45, autoSpin4D: true, tuning: 'pythagorean', camera: { radius: 22, speed: 0.15 } }
  },
  {
    category: 'Geometria 4D',
    title: 'O Espaço-Tempo de Minkowski',
    formula: '(x, y, z, ct)',
    focus: 'center',
    text: 'Na Relatividade Especial de Einstein, o universo é modelado como um contínuo quadridimensional onde três eixos espaciais se unem à dimensão temporal.',
    visualCue: 'A mira aponta para o evento central (origem) enquanto as fatias temporais W rotacionam ao redor.',
    pace: 'calm',
    duration: 15,
    setup: { base: 3, exp: 4, filter: 'all', explode: 0.26, slice: 0.80, rotXW: 30, rotYW: 15, autoSpin4D: true, scanner: true, tuning: 'harmonic', camera: { radius: 21, speed: 0.14 } }
  },
  {
    category: 'Geometria 4D',
    title: 'A 8ª Dimensão e a Rede E8',
    formula: '2⁸ = 256 vértices',
    focus: 'corner',
    text: 'O octeracto (8D) possui 256 vértices e conecta-se diretamente à excepcional simetria E8, estudada na física teórica de unificação de partículas.',
    visualCue: 'Observe os 256 vértices projetados do hiperespaço de 8 dimensões em movimento contínuo.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 2, exp: 8, filter: 'all', explode: 0.28, slice: 1, rotXW: 45, rotYW: 30, autoSpin4D: true, tuning: 'harmonic', camera: { radius: 23, speed: 0.14 } }
  },
  {
    category: 'Geometria 4D',
    title: 'Ortogonalidade Além da Intuição',
    formula: '4⁴ = 256',
    focus: 'corner',
    text: 'Em 3D só cabem três retas mutuamente perpendiculares (X, Y e Z). Em 4D surge uma quarta direção W perpendicular a todas as três ao mesmo tempo.',
    visualCue: 'Note como o deslocamento ao longo de W cria anéis concêntricos perfeitos na projeção 3D.',
    pace: 'calm',
    duration: 15,
    setup: { base: 4, exp: 4, filter: 'all', explode: 0.30, slice: 0.90, rotXW: 60, rotYW: 10, autoSpin4D: true, tuning: 'edo', camera: { radius: 23, speed: 0.15 } }
  },
  {
    category: 'Geometria 4D',
    title: 'Arestas de um Hipercubo',
    formula: 'A = d · 2ᵈ⁻¹',
    focus: 'zcurve',
    text: 'Enquanto um cubo 3D tem 12 arestas, um tesseract 4D possui 32 arestas de mesmo comprimento que se cruzam apenas na sombra projetada.',
    visualCue: 'Com os cubos ocultos, observe apenas a malha vetorial conectando os vértices em 4 dimensões.',
    pace: 'calm',
    duration: 15,
    setup: { base: 2, exp: 4, cubesVisible: false, zCurve: true, explode: 0.45, slice: 1, rotXW: 40, rotYW: 40, autoSpin4D: true, tuning: 'pythagorean', camera: { radius: 19, speed: 0.16 } }
  },
  {
    category: 'Geometria 4D',
    title: 'Simetria Hipercúbica de Ordem 384',
    formula: '2⁴ × 4! = 384',
    focus: 'corner',
    text: 'Um tesseract admite 384 rotações e reflexões que o deixam idêntico a si mesmo — oito vezes mais simetrias do que um cubo comum.',
    visualCue: 'Acompanhe o Scanner Laser tocando acordes enquanto o hipercubo 2⁴ atravessa suas configurações simétricas.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 2, exp: 4, filter: 'all', explode: 0.44, slice: 1, rotXW: 50, rotYW: 50, autoSpin4D: true, scanner: true, tuning: 'harmonic', camera: { radius: 19, speed: 0.15 } }
  },

  // =========================================================================
  // 4. TEORIA DOS NÚMEROS & PRIMOS (18)
  // =========================================================================
  {
    category: 'Teoria dos Números',
    title: 'Constelação de Primos no Espaço',
    formula: '5³ = 125 (Primos)',
    focus: 'prime',
    text: 'Filtrando apenas os índices primos entre 125 posições, emerge uma distribuição assimétrica sem fórmula simples — o alicerce da criptografia moderna.',
    visualCue: 'A mira aponta diretamente para um bloco de índice primo: apenas posições indivisíveis restaram visíveis no cubo 5×5×5.',
    pace: 'calm',
    duration: 15,
    setup: { base: 5, exp: 3, filter: 'prime', explode: 0.28, slice: 1, scanner: true, tuning: 'harmonic', camera: { radius: 21, speed: 0.19 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'Primos em Alta Dimensão',
    formula: '4⁴ = 256 (Primos)',
    focus: 'prime',
    text: 'À medida que o expoente sobe para a 4ª dimensão, os números primos tornam-se gradualmente mais esparsos, formando ilhas irregulares no hiperespaço.',
    visualCue: 'Observe este bloco primo isolado flutuando na projeção 4D enquanto os números compostos foram ocultados pelo filtro.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 4, exp: 4, filter: 'prime', explode: 0.34, slice: 1, rotXW: 28, rotYW: 20, autoSpin4D: true, scanner: false, tuning: 'pythagorean', camera: { radius: 22, speed: 0.16 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'Os Átomos da Aritmética',
    formula: '6³ = 216 (Primos)',
    focus: 'prime',
    text: 'Pelo Teorema Fundamental da Aritmética, todo número inteiro maior que 1 é primo ou formado por uma combinação única de fatores primos.',
    visualCue: 'Veja os 47 números primos menores que 216 destacados dentro do volume 6×6×6.',
    pace: 'calm',
    duration: 15,
    setup: { base: 6, exp: 3, filter: 'prime', explode: 0.24, slice: 1, scanner: true, tuning: 'edo', camera: { radius: 22, speed: 0.18 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'Primos de Mersenne e Potências de 2',
    formula: 'Mₚ = 2ᵖ - 1',
    focus: 'prime',
    text: 'Os maiores números primos já descobertos pela humanidade têm a forma 2ᵖ - 1, como 2⁷ - 1 = 127, escondido na última posição antes de 128.',
    visualCue: 'Observe os primos filtrados na grade binária 2⁷ = 128, culminando no primo de Mersenne 127.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 2, exp: 7, filter: 'prime', explode: 0.30, slice: 1, scanner: true, tuning: 'harmonic', camera: { radius: 21, speed: 0.18 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'Primos Gêmeos na Grade Cúbica',
    formula: '(p, p + 2)',
    focus: 'prime',
    text: 'Pares de primos separados por apenas 2 unidades — como (11, 13), (17, 19) e (29, 31) — surgem lado a lado mesmo em regiões densas da grade.',
    visualCue: 'Repare nos pares de blocos primos vizinhos separados por uma única lacuna vazia no cubo 7³ = 343.',
    pace: 'calm',
    duration: 15,
    setup: { base: 7, exp: 3, filter: 'prime', explode: 0.22, slice: 1, scanner: false, tuning: 'pythagorean', camera: { radius: 23, speed: 0.17 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'A Anatomia do Cubo de Rubik',
    formula: '3³ = 27',
    focus: 'center',
    text: 'Um cubo 3×3×3 possui 27 sub-unidades: 8 cantos de três cores, 12 meio-arestas, 6 centros de face e 1 núcleo central invisível que sustenta o mecanismo.',
    visualCue: 'Com a expansão aberta, a linha guia aponta exatamente para o núcleo central cercado pelas 26 peças externas.',
    pace: 'geometric',
    duration: 14,
    setup: { base: 3, exp: 3, filter: 'all', explode: 0.45, slice: 1, zCurve: false, scanner: false, tuning: 'pythagorean', camera: { radius: 18, speed: 0.21 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'Fatoração Geométrica de Bases',
    formula: '6³ = 2³ × 3³ = 216',
    focus: 'slice',
    text: 'Dobrar a base de 3 para 6 no mesmo expoente cúbico multiplica o volume por 2³ = 8 vezes, fundindo simetrias binárias e ternárias na mesma grade.',
    visualCue: 'Veja o corte em camadas do cubo 6×6×6 (216 blocos), onde cada sub-bloco 2×2×2 equivale a uma unidade do cubo 3³.',
    pace: 'calm',
    duration: 14,
    setup: { base: 6, exp: 3, filter: 'all', explode: 0.15, slice: 0.78, zCurve: false, scanner: true, tuning: 'edo', camera: { radius: 22, speed: 0.17 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'O Único Primo Par do Universo',
    formula: '2 (O Primo Singular)',
    focus: 'prime',
    text: 'O número 2 é o único número primo par; todos os outros pares são divisíveis por ele. Por isso, metade das colunas da grade nunca contém primos.',
    visualCue: 'Observe como os blocos primos evitam sistematicamente os planos pares na estrutura 4³ = 64.',
    pace: 'calm',
    duration: 14,
    setup: { base: 4, exp: 3, filter: 'prime', explode: 0.32, slice: 1, scanner: false, tuning: 'harmonic', camera: { radius: 19, speed: 0.19 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'Teorema dos Números Primos de Gauss',
    formula: 'π(x) ≈ x / ln(x)',
    focus: 'prime',
    text: 'Embora cada primo individual pareça imprevisível, a quantidade total de primos até x segue suavemente a curva x / ln(x) descoberta por Gauss aos 15 anos.',
    visualCue: 'Veja os 168 primos menores que 1.000 distribuídos ao longo do cubo decimal 10³.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 10, exp: 3, filter: 'prime', explode: 0.18, slice: 1, scanner: true, tuning: 'edo', camera: { radius: 24, speed: 0.16 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'Números Perfeitos de Euclides',
    formula: '2ᵖ⁻¹(2ᵖ - 1) → 6, 28, 496',
    focus: 'corner',
    text: 'Quando 2ᵖ - 1 é primo, multiplicá-lo por 2ᵖ⁻¹ gera um número perfeito — igual à soma de seus divisores próprios, como 6 (1+2+3) e 28 (1+2+4+7+14).',
    visualCue: 'A estrutura 6² = 36 nasce diretamente do primeiro número perfeito (6) elevado ao quadrado.',
    pace: 'calm',
    duration: 14,
    setup: { base: 6, exp: 2, filter: 'all', explode: 0.26, slice: 1, zCurve: false, scanner: true, tuning: 'pythagorean', camera: { radius: 17, speed: 0.20 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'O Crivo de Eratóstenes em 3D',
    formula: '8³ = 512 (Primos)',
    focus: 'prime',
    text: 'Eliminar múltiplos de 2, 3, 5, 7 e 11 peneira os compostos e deixa apenas os 97 primos menores que 512 suspensos no espaço.',
    visualCue: 'Acompanhe o filtro de primos revelando os 97 sobreviventes do Crivo dentro do cubo 8×8×8.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 8, exp: 3, filter: 'prime', explode: 0.22, slice: 1, scanner: false, tuning: 'harmonic', camera: { radius: 23, speed: 0.17 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'O Último Teorema de Fermat',
    formula: 'xⁿ + yⁿ ≠ zⁿ (n ≥ 3)',
    focus: 'slice',
    text: 'Enquanto quadrados se somam perfeitamente (3² + 4² = 5²), Fermat afirmou em 1637 que dois cubos ou potências maiores nunca somam outro cubo inteiro.',
    visualCue: 'Observe a rigidez volumétrica do cubo 5³ = 125 unidades exposta pelo corte transversal.',
    pace: 'calm',
    duration: 15,
    setup: { base: 5, exp: 3, filter: 'all', explode: 0.18, slice: 0.72, zCurve: false, scanner: false, tuning: 'pythagorean', camera: { radius: 20, speed: 0.18 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'Primos de Sophie Germain',
    formula: 'p e 2p + 1 primos',
    focus: 'prime',
    text: 'Números primos p tais que 2p + 1 também é primo — como 2, 3, 5, 11, 23 e 29 — são fundamentais para gerar chaves criptográficas seguras.',
    visualCue: 'A mira destaca um bloco primo dentro da malha 3⁵ = 243 filtrada.',
    pace: 'calm',
    duration: 15,
    setup: { base: 3, exp: 5, filter: 'prime', explode: 0.28, slice: 1, scanner: true, tuning: 'harmonic', camera: { radius: 22, speed: 0.17 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'O Número de Hardy-Ramanujan',
    formula: '1.729 = 1³+12³ = 9³+10³',
    focus: 'slice',
    text: 'Ramanujan reconheceu instantaneamente 1.729 como o menor número expresso como soma de dois cubos positivos de duas maneiras distintas.',
    visualCue: 'Veja o cubo 9³ = 729 blocos — exatamente a primeira metade da soma 9³ + 10³ = 1.729.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 9, exp: 3, filter: 'all', explode: 0.12, slice: 0.75, zCurve: false, scanner: false, tuning: 'pythagorean', camera: { radius: 24, speed: 0.16 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'Lacunas Entre Primos Consecutivos',
    formula: '9³ = 729 (Primos)',
    focus: 'prime',
    text: 'Podem existir intervalos arbitrariamente longos sem nenhum número primo, criando verdadeiros vazios cósmicos na reta numérica.',
    visualCue: 'Note os corredores vazios entre os aglomerados de primos no cubo 9×9×9.',
    pace: 'calm',
    duration: 15,
    setup: { base: 9, exp: 3, filter: 'prime', explode: 0.20, slice: 1, scanner: false, tuning: 'edo', camera: { radius: 24, speed: 0.17 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'A Hipótese de Riemann e os Zeros',
    formula: '2⁹ = 512 (Primos)',
    focus: 'prime',
    text: 'O maior problema em aberto da matemática conecta a distribuição dos números primos às frequências de ressonância da função zeta de Riemann.',
    visualCue: 'Ouça o Scanner Laser tocando os 97 primos menores que 512 como notas de uma escala natural.',
    pace: 'calm',
    duration: 15,
    setup: { base: 2, exp: 9, filter: 'prime', explode: 0.24, slice: 1, scanner: true, tuning: 'harmonic', camera: { radius: 23, speed: 0.16 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'Quadrados e Cubos Simultâneos',
    formula: '2⁶ = 8² = 4³ = 64',
    focus: 'center',
    text: 'Toda sexta potência é simultaneamente um quadrado perfeito e um cubo perfeito: 64 é 8×8 no plano e 4×4×4 no espaço.',
    visualCue: 'Observe o bloco central da estrutura 4³ = 64 que também representa 8² e 2⁶.',
    pace: 'geometric',
    duration: 14,
    setup: { base: 4, exp: 3, filter: 'all', explode: 0.34, slice: 1, zCurve: true, scanner: false, tuning: 'edo', camera: { radius: 19, speed: 0.20 } }
  },
  {
    category: 'Teoria dos Números',
    title: 'Primos em Simetria Quadridimensional',
    formula: '3⁴ = 81 (Primos)',
    focus: 'prime',
    text: 'Dos 81 hiper-blocos de um tesseract ternário, exatamente 22 possuem índice primo, orbitando o hiperespaço como satélites.',
    visualCue: 'Acompanhe os 22 blocos primos girando nos planos XW e YW da projeção 4D.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 3, exp: 4, filter: 'prime', explode: 0.38, slice: 1, rotXW: 40, rotYW: 30, autoSpin4D: true, scanner: true, tuning: 'harmonic', camera: { radius: 21, speed: 0.15 } }
  },

  // =========================================================================
  // 5. NATUREZA, FRACTAIS & BIOLOGIA (18)
  // =========================================================================
  {
    category: 'Natureza & Fractais',
    title: 'Fiação Fractal da Curva Ternária',
    formula: '3⁴ = 81 → Curva Z',
    focus: 'zcurve',
    text: 'Redes neurais, vasos sanguíneos e raízes seguem leis de ramificação exponencial para preencher o máximo de volume 3D gastando o mínimo de energia.',
    visualCue: 'O ponteiro segue um nó da Curva Espacial Z conectando os 81 pontos sem cruzamentos caóticos.',
    pace: 'calm',
    duration: 15,
    setup: { base: 3, exp: 4, cubesVisible: false, zCurve: true, explode: 0.20, slice: 1, tuning: 'harmonic', camera: { radius: 21, speed: 0.20 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'Mitose e Crescimento Celular',
    formula: '2⁵ = 32',
    focus: 'zcurve',
    text: 'Em condições ideais, uma única célula se divide em 2, 4, 8, 16 e 32. Essa duplicação silenciosa explica como embriões formam bilhões de células em dias.',
    visualCue: 'Observe os pares simétricos na estrutura 2⁵ = 32 interligados pela Curva Z em cada geração de divisão.',
    pace: 'geometric',
    duration: 14,
    setup: { base: 2, exp: 5, filter: 'all', explode: 0.36, slice: 1, zCurve: true, scanner: false, tuning: 'harmonic', camera: { radius: 19, speed: 0.21 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'A Série Harmônica Natural',
    formula: 'f · n (n = 1, 2, 3...)',
    focus: 'corner',
    text: 'Toda corda vibrante soa simultaneamente em múltiplos inteiros de sua frequência fundamental. A consonância musical nasce diretamente das proporções inteiras.',
    visualCue: 'Ouça o Scanner Laser ativando os blocos do cubo 4³ = 64 afinados em múltiplos naturais da frequência fundamental.',
    pace: 'calm',
    duration: 15,
    setup: { base: 4, exp: 3, filter: 'all', explode: 0.26, slice: 1, scanner: true, tuning: 'harmonic', camera: { radius: 20, speed: 0.16 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'A Esponja de Menger Fractal',
    formula: '3³ - 7 = 20 blocos',
    focus: 'center',
    text: 'Removendo o núcleo central e os 6 centros de face de um cubo 3×3×3 restam 20 blocos. Repetir isso infinitamente cria área infinita com volume zero.',
    visualCue: 'Observe o cubo 3³ expandido destacando as faces e o centro que são escavados na Esponja de Menger.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 3, exp: 3, filter: 'all', explode: 0.46, slice: 1, zCurve: false, scanner: false, tuning: 'pythagorean', camera: { radius: 18, speed: 0.20 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'O Código Genético em Base 4',
    formula: '4³ = 64 códons',
    focus: 'corner',
    text: 'O DNA usa 4 bases nitrogenadas (A, T, C, G) lidas em trincas. Existem exatamente 4³ = 64 códons possíveis para codificar todos os aminoácidos da vida.',
    visualCue: 'Cada um dos 64 blocos do cubo 4×4×4 representa uma trinca genética única do código da vida.',
    pace: 'calm',
    duration: 15,
    setup: { base: 4, exp: 3, filter: 'all', explode: 0.28, slice: 1, zCurve: true, scanner: false, tuning: 'harmonic', camera: { radius: 20, speed: 0.19 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'A Escala Temperada de 12 Semitons',
    formula: 'f × 2^(k/12)',
    focus: 'corner',
    text: 'No piano moderno, cada oitava dobra a frequência (×2) e é dividida em 12 passos exponenciais iguais usando a raiz décima-segunda de 2 (≈ 1,05946).',
    visualCue: 'Acompanhe o Scanner Laser percorrendo intervalos temperados de 12-EDO sobre a grade.',
    pace: 'calm',
    duration: 15,
    setup: { base: 12, exp: 2, filter: 'all', explode: 0.22, slice: 1, scanner: true, tuning: 'edo', camera: { radius: 20, speed: 0.18 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'A Quinta Justa de Pitágoras',
    formula: '(3/2)¹² vs 2⁷',
    focus: 'zcurve',
    text: 'Empilhar 12 quintas musicais puras (razão 3/2) quase fecha 7 oitavas (2⁷ = 128), deixando uma pequena diferença chamada Coma Pitagórica.',
    visualCue: 'Ouça a afinação Pitagórica enquanto a Curva Z percorre as 128 divisões da sétima oitava binária.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 2, exp: 7, filter: 'all', explode: 0.24, slice: 1, zCurve: true, scanner: true, tuning: 'pythagorean', camera: { radius: 22, speed: 0.17 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'Ramificação dos Alvéolos Pulmonares',
    formula: '2⁸ = 256 brônquios',
    focus: 'zcurve',
    text: 'A traqueia humana bifurca-se exponencialmente cerca de 23 vezes até formar 300 milhões de alvéolos — uma área de troca gasosa do tamanho de uma quadra de tênis.',
    visualCue: 'Veja a árvore binária 2⁸ traçada pela Curva Z maximizando o alcance espacial em um volume compacto.',
    pace: 'calm',
    duration: 15,
    setup: { base: 2, exp: 8, cubesVisible: false, zCurve: true, explode: 0.18, slice: 1, tuning: 'harmonic', camera: { radius: 22, speed: 0.18 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'Dimensão Fractal de Hausdorff',
    formula: 'D = log(N) / log(S)',
    focus: 'zcurve',
    text: 'Nem toda forma tem dimensão inteira: o litoral da Grã-Bretanha tem dimensão fractal ~1,25 e o córtex cerebral humano atinge ~2,79 por suas dobras.',
    visualCue: 'Observe a Curva Z preenchendo o volume 3D com uma única linha contínua de dimensão fractal.',
    pace: 'calm',
    duration: 15,
    setup: { base: 4, exp: 3, cubesVisible: false, zCurve: true, explode: 0.20, slice: 1, tuning: 'harmonic', camera: { radius: 20, speed: 0.20 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'Redes Cristalinas e Simetria Cúbica',
    formula: '5³ = 125 átomos',
    focus: 'center',
    text: 'Cristais de sal-gema, diamante e pirita organizam seus átomos em grades cúbicas periódicas de alcance exponencial.',
    visualCue: 'Veja a regularidade cristalina dos 125 nós atômicos no cubo 5×5×5 expandido.',
    pace: 'geometric',
    duration: 14,
    setup: { base: 5, exp: 3, filter: 'all', explode: 0.34, slice: 1, zCurve: false, scanner: false, tuning: 'pythagorean', camera: { radius: 21, speed: 0.18 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'Meia-Vida Radioativa e Carbono-14',
    formula: 'N(t) = N₀ · (1/2)ⁿ',
    focus: 'slice',
    text: 'A cada 5.730 anos, metade dos átomos de Carbono-14 decai. Após 7 meias-vidas resta apenas 1/128 da amostra original, permitindo datar fósseis.',
    visualCue: 'Observe apenas uma fração remanescente da estrutura 2⁷ = 128 após sucessivos decaimentos.',
    pace: 'calm',
    duration: 15,
    setup: { base: 2, exp: 7, filter: 'all', explode: 0.20, slice: 0.45, zCurve: false, scanner: false, tuning: 'edo', camera: { radius: 21, speed: 0.17 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'A Escala Richter de Terremotos',
    formula: '10¹·⁵ ≈ 31,6× energia',
    focus: 'corner',
    text: 'Cada grau inteiro na escala Richter multiplica a amplitude das ondas sísmicas por 10 e a energia liberada por cerca de 31,6 vezes.',
    visualCue: 'A grade 10×10 = 100 ilustra dois degraus inteiros de amplitude na escala logarítmica.',
    pace: 'geometric',
    duration: 14,
    setup: { base: 10, exp: 2, filter: 'all', explode: 0.22, slice: 1, zCurve: false, scanner: true, tuning: 'edo', camera: { radius: 20, speed: 0.19 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'Decibéis e a Audição Humana',
    formula: '10 dB = 10× intensidade',
    focus: 'corner',
    text: 'Nossos ouvidos percebem sons em escala logarítmica: um aumento de 30 decibéis representa 10³ = 1.000 vezes mais potência acústica.',
    visualCue: 'Veja os 1.000 blocos de 10³ representando o salto energético entre um sussurro e uma conversa.',
    pace: 'calm',
    duration: 14,
    setup: { base: 10, exp: 3, filter: 'all', explode: 0.14, slice: 0.82, zCurve: false, scanner: true, tuning: 'harmonic', camera: { radius: 24, speed: 0.16 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'A Escala de pH da Química',
    formula: '[H⁺] = 10⁻ᵖᴴ',
    focus: 'slice',
    text: 'Cada unidade de pH muda a acidez em 10 vezes: o suco de limão (pH 2) é 10⁵ = 100.000 vezes mais ácido que a água pura (pH 7).',
    visualCue: 'Observe o gradiente de camadas na estrutura 7³ = 343 unidades.',
    pace: 'calm',
    duration: 14,
    setup: { base: 7, exp: 3, filter: 'all', explode: 0.16, slice: 0.74, zCurve: false, scanner: false, tuning: 'pythagorean', camera: { radius: 22, speed: 0.17 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'O Conectoma e Sinapses Cerebrais',
    formula: '4⁴ = 256 → Curva Z',
    focus: 'zcurve',
    text: 'Com 86 bilhões de neurônios fazendo milhares de conexões cada, o cérebro humano opera sobre uma rede hiperdimensional de caminhos paralelos.',
    visualCue: 'Acompanhe o pulso da Curva Z percorrendo 256 nós interconectados em 4 dimensões.',
    pace: 'calm',
    duration: 15,
    setup: { base: 4, exp: 4, cubesVisible: false, zCurve: true, explode: 0.22, slice: 1, rotXW: 25, rotYW: 20, autoSpin4D: true, tuning: 'harmonic', camera: { radius: 23, speed: 0.16 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'Colônias Bacterianas em Fase Log',
    formula: '2¹⁰ = 1.024 bactérias',
    focus: 'corner',
    text: 'Dividindo-se a cada 20 minutos, uma única bactéria gera 1.024 descendentes em pouco mais de 3 horas e mais de 1 milhão em menos de 7 horas.',
    visualCue: 'Veja os 1.024 indivíduos gerados após apenas 10 ciclos de divisão binária.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 2, exp: 10, filter: 'all', explode: 0.18, slice: 1, zCurve: false, scanner: false, tuning: 'edo', camera: { radius: 24, speed: 0.16 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'Simetria Pentagonal das Flores',
    formula: '5² = 25 pétalas/sementes',
    focus: 'center',
    text: 'Muitas flores e estrelas-do-mar exibem simetria de base 5 ligada à proporção áurea φ, otimizando a exposição solar das folhas sem sombra mútua.',
    visualCue: 'A mira aponta para o centro da malha simétrica 5×5 = 25 unidades.',
    pace: 'calm',
    duration: 13,
    setup: { base: 5, exp: 2, filter: 'all', explode: 0.32, slice: 1, zCurve: true, scanner: true, tuning: 'pythagorean', camera: { radius: 16, speed: 0.21 } }
  },
  {
    category: 'Natureza & Fractais',
    title: 'A Curva de Hilbert e Preenchimento Espacial',
    formula: '2⁶ → Curva Contínua',
    focus: 'zcurve',
    text: 'Em 1891, David Hilbert provou que uma curva unidimensional contínua pode passar por todos os pontos de um volume 3D sem deixar lacunas.',
    visualCue: 'Observe o traçado geométrico dobrando-se nos três eixos para visitar todos os 64 blocos.',
    pace: 'calm',
    duration: 15,
    setup: { base: 2, exp: 6, filter: 'all', explode: 0.28, slice: 1, zCurve: true, scanner: false, tuning: 'harmonic', camera: { radius: 21, speed: 0.19 } }
  },

  // =========================================================================
  // 6. ESCALA CÓSMICA & FÍSICA (18)
  // =========================================================================
  {
    category: 'Física & Entropia',
    title: 'Colapso da Torre Cúbica',
    formula: '4⁴ = 256 (F = ma)',
    focus: 'physics',
    text: 'Estruturas exponenciais crescem em massa muito mais rápido que na base de apoio. Quando a gravidade assume, a ordem geométrica vira cascata cinética.',
    visualCue: 'O pop-up segue este bloco durante toda a física: ele despenca sob gravidade, salta na onda de choque e retrocede no tempo.',
    pace: 'dynamic',
    duration: 17,
    setup: { base: 4, exp: 4, filter: 'all', explode: 0.12, slice: 1, physicsSequence: true, tuning: 'edo', camera: { radius: 26, speed: 0.12 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'Reação em Cadeia Estelar',
    formula: '3⁵ = 243',
    focus: 'physics',
    text: 'Quando cada reação libera 3 novos nêutrons, apenas 5 gerações já multiplicam a energia por 243 — o mesmo efeito cascata que acende o núcleo das estrelas.',
    visualCue: 'Acompanhe o bloco rastreado colapsando em cascata junto aos outros 242 e retornando à formação original.',
    pace: 'dynamic',
    duration: 17,
    setup: { base: 3, exp: 5, filter: 'all', explode: 0.20, slice: 1, physicsSequence: true, tuning: 'pythagorean', camera: { radius: 25, speed: 0.13 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'O Horizonte de Mil Unidades',
    formula: '10³ = 1.000',
    focus: 'slice',
    text: 'Nossa base decimal transforma um cubo de aresta 10 em exatos 1.000 blocos — a ponte visual entre o metro, o decímetro e o milímetro cúbico.',
    visualCue: 'A mira aponta para o plano de corte na grade 10×10×10 (1.000 unidades), revelando a organização decimal em camadas.',
    pace: 'calm',
    duration: 15,
    setup: { base: 10, exp: 3, filter: 'all', explode: 0.10, slice: 0.72, zCurve: false, scanner: false, tuning: 'edo', camera: { radius: 24, speed: 0.15 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'A Lei do Cubo-Quadrado de Galileu',
    formula: 'L² vs L³ (6³ = 216)',
    focus: 'physics',
    text: 'Galileu descobriu que se você aumentar um animal 6 vezes em cada dimensão, sua força muscular cresce 6² = 36 vezes, mas seu peso cresce 6³ = 216 vezes.',
    visualCue: 'Veja os 216 blocos caindo sob seu próprio peso antes de serem reconstituídos no tempo.',
    pace: 'dynamic',
    duration: 17,
    setup: { base: 6, exp: 3, filter: 'all', explode: 0.12, slice: 1, physicsSequence: true, tuning: 'harmonic', camera: { radius: 25, speed: 0.12 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'A Lei do Inverso do Quadrado',
    formula: 'I ∝ 1 / r²',
    focus: 'center',
    text: 'Gravidade, luz e campos elétricos espalham-se sobre esferas cuja área cresce com r². Dobrar a distância reduz a intensidade a 1/4; triplicar reduz a 1/9.',
    visualCue: 'Observe o núcleo luminoso no centro irradiando influência através das camadas concêntricas de 5³.',
    pace: 'calm',
    duration: 14,
    setup: { base: 5, exp: 3, filter: 'all', explode: 0.34, slice: 1, zCurve: false, scanner: true, tuning: 'harmonic', camera: { radius: 21, speed: 0.18 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'Inflação Cósmica nos Primeiros Instantes',
    formula: '2⁸ = 256× expansão',
    focus: 'physics',
    text: 'Nos primeiros 10⁻³² segundos após o Big Bang, o universo dobrou de tamanho dezenas de vezes seguidas, esticando flutuações quânticas em galáxias.',
    visualCue: 'Acompanhe a expansão súbita dos 256 blocos impulsionados pela onda de choque e seu retorno.',
    pace: 'dynamic',
    duration: 17,
    setup: { base: 2, exp: 8, filter: 'all', explode: 0.26, slice: 1, physicsSequence: true, tuning: 'edo', camera: { radius: 25, speed: 0.13 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'Potências de Dez: Do Quark ao Cosmos',
    formula: '10⁻¹⁸ m até 10²⁶ m',
    focus: 'corner',
    text: 'Separar o tamanho de um próton (10⁻¹⁵ m) do universo observável (10²⁶ m) exige apenas 41 degraus na base 10 — uma escada exponencial de 41 andares.',
    visualCue: 'Veja os 1.000 blocos de 10³ representando apenas três degraus consecutivos dessa escada cósmica.',
    pace: 'calm',
    duration: 15,
    setup: { base: 10, exp: 3, filter: 'all', explode: 0.14, slice: 0.85, zCurve: false, scanner: false, tuning: 'edo', camera: { radius: 24, speed: 0.16 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'A Constante de Avogadro',
    formula: '6,022 × 10²³ átomos',
    focus: 'slice',
    text: 'Uma única colher de chá de água contém mais moléculas (cerca de 10²³) do que existem colheres de chá de água em todos os oceanos da Terra.',
    visualCue: 'Observe o corte na grade 8³ = 512 simbolizando o empacotamento microscópico da matéria.',
    pace: 'calm',
    duration: 14,
    setup: { base: 8, exp: 3, filter: 'all', explode: 0.12, slice: 0.70, zCurve: false, scanner: false, tuning: 'pythagorean', camera: { radius: 23, speed: 0.17 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'Radiação de Corpo Negro de Stefan-Boltzmann',
    formula: 'P = σ · A · T⁴',
    focus: 'corner',
    text: 'A energia irradiada por uma estrela cresce com a quarta potência de sua temperatura (T⁴). Dobrar a temperatura superficial multiplica o brilho por 2⁴ = 16 vezes.',
    visualCue: 'Acompanhe os 16 blocos de 2⁴ pulsandos no Scanner Laser como pacotes de fótons térmicos.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 2, exp: 4, filter: 'all', explode: 0.36, slice: 1, zCurve: false, scanner: true, tuning: 'harmonic', camera: { radius: 18, speed: 0.19 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'Entropia de Boltzmann e Microestados',
    formula: 'S = k · ln(W)',
    focus: 'physics',
    text: 'A Segunda Lei da Termodinâmica nasce da estatística: existem exponencialmente mais formas desordenadas de espalhar partículas do que mantê-las num cubo.',
    visualCue: 'Veja a transição da ordem cristalina para a dispersão entrópica — e a reversão temporal artificial do Rewind.',
    pace: 'dynamic',
    duration: 17,
    setup: { base: 4, exp: 3, filter: 'all', explode: 0.16, slice: 1, physicsSequence: true, tuning: 'harmonic', camera: { radius: 24, speed: 0.13 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'O Número de Googol e o Universo',
    formula: '10¹⁰⁰ vs 10⁸⁰ átomos',
    focus: 'corner',
    text: 'Um Googol (10¹⁰⁰) é cem quintilhões de vezes maior que o número estimado de átomos em todo o universo observável (cerca de 10⁸⁰).',
    visualCue: 'Observe a grade 10×10 = 100 blocos: cada bloco aqui representa um único zero na escrita de um Googol.',
    pace: 'calm',
    duration: 14,
    setup: { base: 10, exp: 2, filter: 'all', explode: 0.24, slice: 1, zCurve: true, scanner: false, tuning: 'edo', camera: { radius: 20, speed: 0.18 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'A Terceira Lei Harmônica de Kepler',
    formula: 'T² ∝ a³',
    focus: 'zcurve',
    text: 'O quadrado do período orbital de qualquer planeta é proporcional ao cubo de sua distância média ao Sol — unindo expoentes 2 e 3 na dança celeste.',
    visualCue: 'Acompanhe o movimento orbital contínuo ao redor da estrutura cúbica 3³ = 27.',
    pace: 'calm',
    duration: 14,
    setup: { base: 3, exp: 3, filter: 'all', explode: 0.32, slice: 1, zCurve: true, scanner: true, tuning: 'pythagorean', camera: { radius: 18, speed: 0.21 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'O Limite de Bekenstein e Buracos Negros',
    formula: 'S ∝ Área (2D vs 3D)',
    focus: 'slice',
    text: 'A entropia máxima de um buraco negro não escala com seu volume 3D (R³), mas com a área de seu horizonte de eventos (R²) — inspirando o Princípio Holográfico.',
    visualCue: 'Note como a casca externa envolve todo o volume interno revelado pelo corte na estrutura 6³.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 6, exp: 3, filter: 'all', explode: 0.16, slice: 0.65, zCurve: false, scanner: false, tuning: 'harmonic', camera: { radius: 22, speed: 0.17 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'Cascata de Energia na Turbulência',
    formula: '5³ = 125 vórtices',
    focus: 'physics',
    text: 'Na física dos fluidos, grandes redemoinhos transferem energia exponencialmente para vórtices cada vez menores até dissiparem em calor.',
    visualCue: 'Observe os 125 blocos dispersando-se após o impacto da onda de choque e retornando à coerência.',
    pace: 'dynamic',
    duration: 17,
    setup: { base: 5, exp: 3, filter: 'all', explode: 0.18, slice: 1, physicsSequence: true, tuning: 'edo', camera: { radius: 25, speed: 0.13 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'Magnitudes Estelares de Hiparco',
    formula: '2,512⁵ = 100× brilho',
    focus: 'corner',
    text: 'Uma estrela de 1ª magnitude é exatamente 100 vezes mais brilhante que uma de 6ª magnitude, seguindo uma progressão geométrica de razão ⁵√100 ≈ 2,512.',
    visualCue: 'Veja os 100 blocos de 10² representando a razão de luminosidade entre cinco classes estelares.',
    pace: 'calm',
    duration: 14,
    setup: { base: 10, exp: 2, filter: 'all', explode: 0.25, slice: 1, zCurve: false, scanner: true, tuning: 'harmonic', camera: { radius: 20, speed: 0.18 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'A Velocidade da Luz ao Quadrado',
    formula: 'E = m · c²',
    focus: 'center',
    text: 'Como c ≈ 3 × 10⁸ m/s, elevar c ao quadrado cria o fator gigantesco 9 × 10¹⁶ J/kg — revelando a imensa energia condensada em cada grama de matéria.',
    visualCue: 'A mira aponta para o núcleo energético no centro da estrutura 3⁴ = 81.',
    pace: 'geometric',
    duration: 15,
    setup: { base: 3, exp: 4, filter: 'all', explode: 0.30, slice: 1, rotXW: 20, rotYW: 20, autoSpin4D: true, scanner: true, tuning: 'harmonic', camera: { radius: 21, speed: 0.16 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'A Escala de Planck: O Pixel do Universo',
    formula: 'ℓₚ ≈ 1,6 × 10⁻³⁵ m',
    focus: 'center',
    text: 'Abaixo do comprimento de Planck (10⁻³⁵ m), as noções clássicas de espaço contínuo deixam de fazer sentido, sugerindo uma granularidade fundamental da realidade.',
    visualCue: 'Observe os blocos discretos representando unidades quantizadas indivisíveis no espaço 3D.',
    pace: 'calm',
    duration: 14,
    setup: { base: 4, exp: 3, filter: 'all', explode: 0.30, slice: 1, zCurve: false, scanner: false, tuning: 'pythagorean', camera: { radius: 19, speed: 0.19 } }
  },
  {
    category: 'Escala Cósmica',
    title: 'Recorrência de Poincaré',
    formula: '2⁷ = 128 estados',
    focus: 'physics',
    text: 'O teorema de Poincaré mostra que sistemas físicos fechados acabam retornando arbitrariamente perto de seu estado inicial após tempos astronômicos.',
    visualCue: 'Acompanhe o ciclo completo de dispersão e rebobinamento restaurando perfeitamente a configuração inicial.',
    pace: 'dynamic',
    duration: 17,
    setup: { base: 2, exp: 7, filter: 'all', explode: 0.22, slice: 1, physicsSequence: true, tuning: 'harmonic', camera: { radius: 24, speed: 0.13 } }
  }
];