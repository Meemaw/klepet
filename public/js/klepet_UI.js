function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  if (jeSmesko) {
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace('&lt;img', '<img').replace('png\' /&gt;', 'png\' />');
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}


function isPictureLinkCheck(sporocilo) {
  var linkRegex = '^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*).(jpg|gif|png)';
  var regExp = new RegExp(linkRegex, "gi");

  console.log(sporocilo.match(regExp));
  return 1;
}

function handlePictureLinks(sporocilo) {
  var split = sporocilo.match(/\S+/g);
  console.log(split);
  var count = 0;
  for(var i = 0; i < split.length; i++) {
      if(split[i].startsWith("http")  && (split[i].endsWith(".jpg") || split[i].endsWith(".png") || split[i].endsWith("gif"))) {
        $('#sporocila').append(imgElementHtml(split[i]));
        $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
        
      }
  }
}



function imgElementHtml(sporocilo) {
  var elem = document.createElement("img");
  elem.setAttribute("src", sporocilo);
  elem.setAttribute("height", "200");
  elem.setAttribute("width", "200");
  elem.style.marginLeft = 20+"px";
  return $('<div></div>').html(elem);
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSmeske(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  }
  else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
  }

  $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  handlePictureLinks(sporocilo);
  checkYoutubeLinks(sporocilo);
  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function getYoutubeElement(videoId) {
  var iframe = document.createElement('iframe');
  iframe.src = 'https://www.youtube.com/embed/' + videoId;
  iframe.style.width = 200+"px";
  iframe.style.height = 150+"px";
  iframe.style.marginLeft = 20+"px";
  iframe.setAttribute('allowFullScreen', '')
  return $('<div></div>').html(iframe);
  
}

function checkYoutubeLinks(sporocilo) {
  var split = sporocilo.match(/\S+/g);
  for(var i = 0; i < split.length; i++) {
    if(split[i].startsWith("https://www.youtube.com/watch?v=")) {
      var videoId = split[i].substring(32,split[i].length);
      var iframe = getYoutubeElement(videoId);
      $('#sporocila').append(iframe);
    }
  }
  
}

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
  
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
    var index = sporocilo.besedilo.indexOf(':',0);
    var sub = sporocilo.besedilo.substr(index, sporocilo.besedilo.length);
    handlePictureLinks(sub);
    checkYoutubeLinks(sub);
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
    
  });
  
  socket.on('dregljaj', function(sporocilo) {
    console.log(sporocilo);
    var vsebina = $('#vsebina');
    vsebina.jrumble();
    vsebina.trigger('startRumble');
    setTimeout(function (){
      vsebina.trigger('stopRumble');
    }, 1500);
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }
    


    $('#seznam-kanalov div').click(function() {
      console.log('opa');
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
    
    
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
    
     $('#seznam-uporabnikov div').click(function() {
      $('#poslji-sporocilo').val('/zasebno "' + $(this).text() + '" ');
      $('#poslji-sporocilo').focus();
    });
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}
