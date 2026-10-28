/* =========================================================
   MISSAO DO DIA + MOEDAS DE OURO (visao do aluno)
   Uma pergunta por dia, uma tentativa. Acertou: +20 XP e
   +10 moedas. A cada 3 dias seguidos respondendo: +15 moedas.
   ========================================================= */
var XP_MISSAO = 20;
var MOEDAS_MISSAO = 10;
var MOEDAS_BONUS = 15;
var DIAS_BONUS = 3;

// m = indice da materia em MATERIAS, o = alternativas, c = indice da certa, e = explicacao
var PERGUNTAS = [
  { m:0, p:'Qual estrutura repete um bloco de código enquanto uma condição for verdadeira?',
    o:['if','while','switch','return'], c:1, e:'O while testa a condição a cada volta e só para quando ela fica falsa.' },
  { m:0, p:'O que é uma função?',
    o:['Um bloco de código nomeado que pode ser chamado várias vezes','Uma variável que nunca muda','Um erro de compilação','Um tipo de imagem'], c:0, e:'Funções evitam repetição: escreve-se uma vez e chama-se quantas vezes precisar.' },
  { m:0, p:'Qual é o primeiro índice de um array na maioria das linguagens (C#, JavaScript, Python)?',
    o:['1','-1','0','10'], c:2, e:'A contagem começa em 0: o primeiro item fica na posição 0.' },

  { m:1, p:'O que é o "game loop"?',
    o:['A tela de menu do jogo','O ciclo que lê entrada, atualiza o estado e desenha a cena a cada quadro','Um tipo de inimigo','O som de fundo repetido'], c:1, e:'Todo jogo repete: ler entrada, atualizar a lógica e desenhar, quadro após quadro.' },
  { m:1, p:'Qual é a função do feedback visual e sonoro quando o jogador acerta um golpe?',
    o:['Só enfeitar a tela','Aumentar o tamanho do arquivo','Mostrar ao jogador que a ação teve efeito e deixá-la satisfatória','Substituir o tutorial'], c:2, e:'Feedback claro (juice) confirma a ação do jogador e torna o jogo mais agradável.' },
  { m:1, p:'O que é um GDD (Game Design Document)?',
    o:['Um motor de jogo','Um documento que descreve conceito, regras, mecânicas e objetivos do jogo','Um formato de imagem','Um tipo de console'], c:1, e:'O GDD organiza as ideias do jogo para que toda a equipe trabalhe com a mesma visão.' },

  { m:2, p:'Qual formato de imagem aceita transparência e é muito usado em sprites?',
    o:['JPG','PNG','TXT','MP3'], c:1, e:'O PNG tem canal alfa (transparência); o JPG não tem.' },
  { m:2, p:'O que é um sprite sheet?',
    o:['Uma imagem com vários quadros de animação lado a lado','Um script de movimento','Um tipo de iluminação 3D','Uma tabela de notas'], c:0, e:'Reunir os quadros em uma só imagem economiza carregamentos e facilita a animação.' },
  { m:2, p:'Na arte 2D, o que significa "pixel art"?',
    o:['Arte feita só com vetores','Fotografia retocada','Arte feita pixel a pixel, em baixa resolução, com paleta limitada','Modelagem em 3D'], c:2, e:'Na pixel art cada ponto é desenhado de propósito, em geral com poucas cores.' },

  { m:3, p:'Qual comando SQL busca dados de uma tabela?',
    o:['INSERT','DELETE','SELECT','DROP'], c:2, e:'SELECT consulta; INSERT cria, DELETE remove registros e DROP apaga a tabela.' },
  { m:3, p:'O que é uma chave primária (primary key)?',
    o:['Uma senha do banco','Um campo que identifica cada registro de forma única','O nome da tabela','Uma cópia de segurança'], c:1, e:'A chave primária não se repete e permite localizar um registro sem ambiguidade.' },
  { m:3, p:'Em um banco de jogo, qual é a melhor forma de guardar o ranking de jogadores?',
    o:['Uma tabela com colunas como jogador e pontuação','Um único texto gigante','Uma imagem do placar','Nenhuma, o ranking não pode ser guardado'], c:0, e:'Uma tabela permite ordenar e filtrar, por exemplo com ORDER BY pontuacao DESC.' },

  { m:4, p:'Qual operação gera o vetor de direção do ponto A até o ponto B?',
    o:['A + B','B - A','A * B','A / B'], c:1, e:'O vetor de A até B é B menos A, muito usado para perseguir alvos.' },
  { m:4, p:'Em um jogo 2D, se a velocidade é 5 unidades por segundo, quanto o objeto anda em 3 segundos?',
    o:['8','2','15','53'], c:2, e:'Distância = velocidade x tempo, então 5 x 3 = 15.' },
  { m:4, p:'Qual é o valor de um ângulo de 180 graus em radianos?',
    o:['π','2π','π/2','1'], c:0, e:'180 graus equivalem a π radianos; 360 graus são 2π.' }
];

var RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

function doisDig(n){ return (n < 10 ? '0' : '') + n; }
function isoDe(d){ return d.getFullYear() + '-' + doisDig(d.getMonth()+1) + '-' + doisDig(d.getDate()); }

// data local AAAA-MM-DD
function hojeISO(){ return isoDe(new Date()); }

// dia anterior de uma data AAAA-MM-DD (meio-dia evita problema de horario de verao)
function diaAnterior(iso){
  var p = iso.split('-');
  return isoDe(new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) - 1, 12));
}

// normaliza moedas e missao; dado ausente ou corrompido vira valor seguro
function prepararMissoes(a){
  var mo = Math.floor(Number(a.moedas));
  a.moedas = (isFinite(mo) && mo > 0) ? mo : 0;

  var m = (a.missao && typeof a.missao === 'object') ? a.missao : {};
  var esc_ = Math.floor(Number(m.escolha));
  var seq  = Math.floor(Number(m.sequencia));
  var data = (typeof m.data === 'string' && RE_DATA.test(m.data)) ? m.data : '';
  a.missao = {
    data: data,
    acertou: m.acertou === true,
    escolha: (esc_ >= 0 && esc_ <= 3) ? esc_ : -1,
    sequencia: (isFinite(seq) && seq > 0 && data) ? seq : 0
  };
  return a;
}

// pergunta do dia: depende so da data e do id do aluno
function perguntaDoDia(a, dia){
  var s = dia + '|' + a.id, h = 0;
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003;
  return PERGUNTAS[h % PERGUNTAS.length];
}

function respondeuHoje(a){ return a.missao.data === hojeISO(); }

// sequencia valida hoje: perdeu se a ultima resposta nao foi hoje nem ontem
function sequenciaAtual(a){
  var d = a.missao.data;
  return (d === hojeISO() || d === diaAnterior(hojeISO())) ? a.missao.sequencia : 0;
}

// registra a resposta e paga a recompensa; devolve null se ja respondeu
function responderMissao(a, escolha){
  prepararMissoes(a);
  var hoje = hojeISO();
  var perg = perguntaDoDia(a, hoje);
  if (a.missao.data === hoje || !(escolha >= 0 && escolha < perg.o.length)) return null;

  var seq = sequenciaAtual(a) + 1;
  var acertou = (escolha === perg.c);
  var xp = acertou ? XP_MISSAO : 0;
  var moedas = acertou ? MOEDAS_MISSAO : 0;
  var bonus = (seq % DIAS_BONUS === 0) ? MOEDAS_BONUS : 0;

  a.missao = { data: hoje, acertou: acertou, escolha: escolha, sequencia: seq };
  a.xp += xp;
  a.moedas += moedas + bonus;

  var subiu   = subirNivel(a);
  var novasMd = conferirMedalhas(a);
  salvar();
  render();
  // o render recria o card; o foco vai para o resultado para o leitor de tela anunciar
  var res = document.getElementById('missao-res');
  if (res) res.focus();

  if (acertou) aviso('Missão cumprida! +' + xp + ' XP e +' + moedas + ' moedas');
  else aviso('Não foi dessa vez. Volte amanhã!', true);
  if (bonus) aviso('\u{1F525} ' + seq + ' dias seguidos! Bônus de +' + bonus + ' moedas');
  subiu.forEach(function(nv){   aviso('\u{1F389} Subiu para o nível ' + nv + '!'); });
  novasMd.forEach(function(md){ aviso('\u{1F3C5} Medalha conquistada: ' + md); });
  return { acertou: acertou, xp: xp, moedas: moedas, bonus: bonus, sequencia: seq };
}

function cardMissoes(a){
  prepararMissoes(a);
  var perg = perguntaDoDia(a, hojeISO());
  var feito = respondeuHoje(a);
  var seq = sequenciaAtual(a);

  var h = '<div class="card missao"><h2>Missão do Dia</h2>';
  h += '<div class="missao-topo">' +
         '<span class="missao-pilula">\u{1FA99} ' + a.moedas + ' moedas</span>' +
         '<span class="missao-pilula">\u{1F525} ' + seq + (seq === 1 ? ' dia seguido' : ' dias seguidos') + '</span>' +
       '</div>';
  h += '<div class="missao-materia">' + esc(MATERIAS[perg.m]) + '</div>';
  h += '<p class="missao-pergunta">' + esc(perg.p) + '</p>';
  h += '<div class="missao-opcoes">';
  perg.o.forEach(function(txt, i){
    var cls = 'missao-op', marca = '';
    if (feito) {
      if (i === perg.c) { cls += ' certa'; marca = '<b>✔ Correta</b>'; }
      else if (i === a.missao.escolha) { cls += ' errada'; marca = '<b>✖ Sua resposta</b>'; }
    }
    h += '<button type="button" class="' + cls + '" data-resposta="' + i + '" data-dia="' + hojeISO() + '"' + (feito ? ' disabled' : '') + '>' +
           '<span class="missao-letra">' + 'ABCD'.charAt(i) + '</span>' +
           '<span class="missao-txt">' + esc(txt) + '</span>' + marca +
         '</button>';
  });
  h += '</div>';

  if (feito) {
    h += '<div class="missao-resultado ' + (a.missao.acertou ? 'ok' : 'erro') + '" role="status" tabindex="-1" id="missao-res">' +
           '<strong>' + (a.missao.acertou ? '\u{1F389} Acertou! +' + XP_MISSAO + ' XP e +' + MOEDAS_MISSAO + ' moedas' : 'Errou desta vez. Sem XP hoje.') + '</strong>' +
           '<p>' + esc(perg.e) + '</p>' +
           '<p class="missao-volte">Volte amanhã para a próxima missão e mantenha a sequência. A cada ' + DIAS_BONUS + ' dias seguidos: +' + MOEDAS_BONUS + ' moedas.</p>' +
         '</div>';
  } else {
    h += '<p class="missao-dica">Uma tentativa por dia. Acertar vale +' + XP_MISSAO + ' XP e +' + MOEDAS_MISSAO + ' moedas.</p>';
  }
  return h + '</div>';
}

function ligarMissoes(){
  var bs = document.querySelectorAll('[data-resposta]');
  for (var i = 0; i < bs.length; i++) {
    bs[i].onclick = function(){
      // pagina aberta desde ontem: mostra a pergunta de hoje em vez de corrigir a velha
      if (this.getAttribute('data-dia') !== hojeISO()) { render(); return; }
      var a = acharAluno(euSou);
      if (a) responderMissao(a, Number(this.getAttribute('data-resposta')));
    };
  }
}
