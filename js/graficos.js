/* =========================================================
   GRAFICO RADAR EM SVG PURO (5 eixos, escala 0-10)
   ========================================================= */
function radarSVG(a){
  var cx=150, cy=118, R=82, N=a.materias.length;

  function ponto(i, raio){
    var ang = (-90 + i*(360/N)) * Math.PI/180;
    return [cx + Math.cos(ang)*raio, cy + Math.sin(ang)*raio];
  }
  function poligono(raios){
    return raios.map(function(r,i){ var p = ponto(i,r); return n1(p[0])+','+n1(p[1]); }).join(' ');
  }

  var svg = '<svg viewBox="-30 0 360 250" width="100%" role="img" aria-label="Gráfico radar das notas">';

  // aneis da escala: 2, 4, 6, 8, 10
  [2,4,6,8,10].forEach(function(v){
    var r = R*(v/10);
    svg += '<polygon points="'+poligono(a.materias.map(function(){ return r; }))+'" '+
           'fill="none" stroke="rgba(255,255,255,'+(v===10?'.45':'.16')+')" stroke-width="1"/>';
  });

  // eixos + rotulos
  a.materias.forEach(function(m,i){
    var e = ponto(i,R);
    svg += '<line x1="'+cx+'" y1="'+cy+'" x2="'+n1(e[0])+'" y2="'+n1(e[1])+'" stroke="rgba(255,255,255,.22)" stroke-width="1"/>';
    var t   = ponto(i, R+20);
    var anc = t[0] > cx+4 ? 'start' : (t[0] < cx-4 ? 'end' : 'middle');
    var baixa = Number(m.nota) < 6;
    svg += '<text x="'+n1(t[0])+'" y="'+n1(t[1]+4)+'" text-anchor="'+anc+'" font-size="10" font-weight="700" '+
           'fill="'+(baixa ? '#FF4D6D' : '#EDE4FF')+'">'+esc(ABREV[i]||m.nome)+'</text>';
  });

  // area das notas reais
  var raios = a.materias.map(function(m){
    return R * (Math.max(0, Math.min(10, Number(m.nota))) / 10);
  });
  svg += '<polygon points="'+poligono(raios)+'" fill="rgba(139,205,106,.35)" stroke="#8BCD6A" stroke-width="2.5" stroke-linejoin="round"/>';

  // vertices (vermelho quando a materia esta abaixo de 6)
  raios.forEach(function(r,i){
    var p = ponto(i,r);
    var baixa = Number(a.materias[i].nota) < 6;
    svg += '<circle cx="'+n1(p[0])+'" cy="'+n1(p[1])+'" r="4" fill="'+(baixa?'#FF4D6D':'#EFCE74')+'" stroke="#1E357E" stroke-width="1.5"/>';
  });

  return svg + '</svg>';
}

/* =========================================================
   AVATAR ILUSTRADO EM SVG (sem imagem externa)
   ========================================================= */
var CAMISAS = ['#E5484D','#8BCD6A','#EFCE74','#4CD4F0','#FF5C8A','#F97316'];
var CABELOS = ['#2B2118','#4A2C15','#8B5E3C','#111827','#6B4423'];
var PELES   = ['#F7D2AE','#E8B98C','#C68642','#8D5524'];

// escolhe sempre a mesma cor para o mesmo aluno, somando os codigos do id
function corDoAluno(texto, paleta){
  var s = 0;
  for (var i=0;i<texto.length;i++) s += texto.charCodeAt(i);
  return paleta[s % paleta.length];
}

function avatarSVG(a){
  var camisa = corDoAluno(a.id,       CAMISAS);
  var cabelo = corDoAluno(a.id + 'h', CABELOS);
  var pele   = corDoAluno(a.id + 'p', PELES);
  var cid    = 'corte' + a.id;

  return '<svg viewBox="0 0 100 100" role="img" aria-label="Avatar de ' + esc(a.nome) + '">' +
    '<defs><clipPath id="' + cid + '"><circle cx="50" cy="52" r="44"/></clipPath></defs>' +
    '<circle cx="50" cy="52" r="44" fill="#5F9BEF"/>' +
    '<g clip-path="url(#' + cid + ')">' +
      '<path d="M12 100c0-22 17-33 38-33s38 11 38 33z" fill="' + camisa + '"/>' +
      '<rect x="42" y="55" width="16" height="18" rx="7" fill="' + pele + '"/>' +
      '<circle cx="50" cy="40" r="21" fill="' + cabelo + '"/>' +
      '<circle cx="50" cy="46" r="19" fill="' + pele + '"/>' +
    '</g>' +
  '</svg>';
}
