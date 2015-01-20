var LAT = 43.082;
var LONG = -89.3675;
var ZOOM = 16;

var MEMBER_DATA_URL = "https://spreadsheets.google.com/feeds/cells/1pCnejtPSK2EhoOlgPM03w09oQketOf9y0h0X-hpmrrU/1/public/basic?alt=json-in-script&callback=?";
var MEMBER_EXTENDED_DATA_URL = "https://spreadsheets.google.com/feeds/cells/1pCnejtPSK2EhoOlgPM03w09oQketOf9y0h0X-hpmrrU/3/public/basic?alt=json-in-script&callback=?";
var MEMBER_CATEGORIES_URL = "https://spreadsheets.google.com/feeds/cells/1pCnejtPSK2EhoOlgPM03w09oQketOf9y0h0X-hpmrrU/2/public/basic?alt=json-in-script&callback=?";
var EVENT_DATA_URL = "https://spreadsheets.google.com/feeds/cells/1L-Q-SoZ4If8TMuQzbnz5mFcnRJ_BcAVcerv-Z80YtW4/1/public/basic?alt=json-in-script&callback=?";
var BANNER_DATA_URL = "https://spreadsheets.google.com/feeds/cells/1Sa-XkixccqJHAJc4zv7JrOG-7hldnIJoePaf7k5JdkM/1/public/basic?alt=json-in-script&callback=?";

var MAP_STYLE_URL = "js/map.json";
var FIRST_CHAR_CODE = 65; //unicdoe 'A'
var NUM_CHARS = 26; //number characters in english alphabet
var NUM_CHARS_X2 = 52;
var ERROR = "#ERROR!";
var DEFAULT_DIRECTORY_ZOOM = 16;
var LEFT_PAN_IN_PIXELS = 270;
var RIGHT_PAN_IN_PIXELS = -200;
var DOWN_PAN_IN_PIXELS = -200;
var DIRECTORY_DOWN_PAN_IN_PIXELS = 10;

var DEFAULT_LAT = 43.0813438; //Williamson St. Madison,WI 53703
var DEFAULT_LOG = -89.3671071; //Williamson St. Madison,WI 53703

var map;
var members = [];
var oneLetterlabelAnchor = new google.maps.Point(6,42);
var twoLetterlabelAnchor = new google.maps.Point(9.5,42);

$(function(){

  var mapCenter = new google.maps.LatLng(LAT,LONG);
  var selectedMember;
  var banners = [];
  var events = [];
  var categories = [];
  var footer = [];
  var pages = {"welcome": [], "membership": [], "contact": [] };
  var defaultImage = "img/default.png";
  var markerDefaultImg = {url:'img/marker_default.png',anchor:new google.maps.Point(7,7)};
  var markerImg = {url:'img/marker.png',anchor:new google.maps.Point(14,48)};
  var markerSelectedImg = {url:'img/marker_selected.png',anchor:new google.maps.Point(14,48)};
  var weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  var months = [ "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december" ];
  var firstResize = false;

  var $footer = $("#footer"),
      $headlines = $(".headline.directory, .headline.events"),
      $directoryList = $(".directory-list"),
      $eventList = $(".events-list"),
      $home = $(".headline.home");


   $home.addClass("active");

   var mapOptions = {
    zoom: ZOOM,
    center: mapCenter,
    panControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    scaleControl: false,
    zoomControl: true,
    zoomControlOptions: {
        style: google.maps.ZoomControlStyle.LARGE,
        position: google.maps.ControlPosition.TOP_RIGHT
    },
    panControlOptions: {
        position: google.maps.ControlPosition.TOP_RIGHT
    }
  };
  map = new google.maps.Map(document.getElementById('map-canvas'),mapOptions);

  var infowindow = new InfoBox({
    boxClass:"marker-container",
    pixelOffset: new google.maps.Size(-226, -350),
    closeBoxMargin: "-15px 5px 2px 2px",
    disableAutoPan:true,
    closeBoxURL:"img/info_window_close.png"
  });

  google.maps.event.addListener(infowindow,'closeclick',function(){
    closeInfoWindow();
  });

  //get banner images
  fetchSheet(BANNER_DATA_URL,banners,function(){
    var $slideshow = $("#slideshow");
    var foundBanners = [];
    banners.forEach(function(b,i){
       if(b.thumbnail){
         foundBanners.push(b);
       }
    });
    foundBanners.forEach(function(b,i){
      var $slide = $("<a target='_blank' href='"+b.websiteurl+"'><div>"+b.title+"</div><img src='"+b.thumbnail+"'></a>");
      var img = new Image();
      $slideshow.append($slide);
      $(img).addClass("bg");
      img.onload = function() {
        Pixastic.process(img, "blurfast", {amount:4.0});
      }
      img.src = b.thumbnail;
      $slide.children("div").after(img);
      if(typeof foundBanners[i+1] === "undefined") $slide.addClass("active");
    });
    setInterval('cycleImages()', 5000);
  });

  //get map style
  $.getJSON(MAP_STYLE_URL,null,function(json,textStatus,jqXHR){
    var styledMap = new google.maps.StyledMapType(json,{name: "Styled Map"});
    map.mapTypes.set('map_style', styledMap);
    map.setMapTypeId('map_style');
  });

  //get member categories
  fetchSheet(MEMBER_CATEGORIES_URL,categories,function(){
    //categories loaded
    var $list = $("ul.directory-cat");
    categories.forEach(function(c,i){
      c.id = className(c.title);
      if(i == 0) $list.append("<li><a class='selected' data-cat='"+c.id+"'>"+c.title+"</a></li>");
      else $list.append("<li><a data-cat='"+c.id+"'>"+c.title+"</a></li>");
    });
    $(".categories a").click(function(){
       var animate = true;
       var catId = $(this).data("cat");
       var $headline = $(this).closest(".headline");
       var $visibleCats = $headline.find(".list li.show");
       $headline.find(".categories a.selected").removeClass("selected");
       $(this).addClass("selected");
       closeInfoWindow(); //close any that are open
       if ( $visibleCats.length == 0 ){
         changeList($headline,catId);
       }
       else{
         $visibleCats.animate({opacity:0},400,function(){
            if(animate){
              changeList($headline,catId);
              animate = false;
            }
         });
       }
    });
    //get member data
    fetchSheet(MEMBER_DATA_URL,members,function(){
        fetchSheet(MEMBER_EXTENDED_DATA_URL,members,membersLoaded);
    });
  });

  //get event data
  fetchSheet(EVENT_DATA_URL,events,function(){
    var todayMonth = months[new Date().getMonth()];
    $(".events-cat li a").filter("[data-cat*='"+todayMonth+"']").addClass("selected");

    events.sort(compareByDate);

    //events loaded
    events.forEach(function(e){

      var startDate = !e.startdate ? new Date() : new Date(e.startdate);
      var startMonth = months[startDate.getMonth()];
      var date = weekdays[startDate.getDay()]+", "+startMonth+" "+startDate.getDate();
      e.month = startMonth;

      //Massage Data
      if (e.enddate){
        var endDate = new Date(e.enddate)
        var endMonth = months[endDate.getMonth()];
        endMonth = endMonth != startMonth ? endMonth+" " : "";
        date += " - "+endMonth+endDate.getDate();
        e.month += ","+endMonth;
      }
      date += ", "+startDate.getFullYear();

      if(!e.thumbnail) e.thumbnail = defaultImage;
      e.show = e.month.indexOf(todayMonth) == -1 ? "" : "show";

      e.title = !e.title ? "" : e.title;
      e.location = !e.location ? "" : e.location;

      if(e.time) e.time = !e.time ? "<a class='event-hours' target='_blank' href='"+e.viewhourslink+"'>View Hours</a>" : "Time: "+e.time;
      else e.time = "";

      e.description = !e.description ? "" : e.description;

      if(e.href) e.href = e.url && e.url.indexOf("http://") == -1 ? "http://"+e.url : e.url;
      else {
         e.href = "";
         e.url = "";
      }

      var classExtend = e.description == "" ? "extend" : "";

      var $event = $("<li data-cat='"+e.month+"' class='"+e.show+"'>"+
                       "<img class='photo' src='"+e.thumbnail+"'></img>" +
                       "<ul class='info'>" +
                         "<li>"+e.title+"</li>" +
                         "<li class='date "+classExtend+"'>"+date+"</li>" +
                         "<li class='"+classExtend+"'>"+e.location+"</li>" +
                         "<li class='"+classExtend+"'>"+e.time+"</li>" +
                         "<li class='"+classExtend+"'><a class='site' target='_blank' href='"+e.href+"'>"+e.url+"</a></li>" +
                       "</ul>" +
                       "<p class='desc'>"+e.description+"</p>" +
                     "</li>");
      $eventList.append($event);
      $event.css("opacity",1);
   });
  });

  //called once members data is fully populated
  function membersLoaded(){

        //load markers based on extented data and lat/log
        var activeCat = $("ul.directory-cat .selected").data("cat");

        //sort alphebetically first
        members.sort(compare);

        members.forEach(function(m,i){
          m.latitude = parseFloat(m.latitude);
          m.longitude = parseFloat(m.longitude);

          /*For a later date
          m.googleplace = jQuery.parseJSON(m.googleplace);*/

          //numeric label
          m.id = i++;

          if (!m.latitude || !m.longitude){
            m.latitude = DEFAULT_LAT;
            m.longitude = DEFAULT_LOG;
          }

          var p = new google.maps.LatLng(m.latitude,m.longitude);

          m.marker = {};
          m.marker.plain = new google.maps.Marker({ map:map, position:p, animation:google.maps.Animation.DROP, icon:markerDefaultImg,clickable: true, visible:true});
          m.marker.labelled = new MarkerWithLabel({map:map, position:p, icon:markerImg, labelInBackground:false, labelClass:"marker-label-labelled",visible:false });
          m.marker.selected = new MarkerWithLabel({map:map, position:p, icon:markerSelectedImg, labelInBackground:false, labelClass:"marker-label-selected",visible:false });
          google.maps.event.addListener(m.marker.plain, 'click', function(){ memberSelected(m); });
          google.maps.event.addListener(m.marker.labelled, 'click', function(){ memberSelected(m); });

          //Massage Data
          if(m.categories){
            var cats = m.categories.split(",");
            m.categories = "";
            cats.forEach(function(c,i){
              m.categories += className(c)+",";
            });
          }
          else m.categories = "";

          m.show = m.categories.indexOf(activeCat) == -1 ? "" : "show";
          if(!m.thumbnail || m.thumbnail == ERROR) m.thumbnail = defaultImage;

          m.title = !m.title ? "" : m.title;
          m.address = !m.address ? "" : m.address;
          m.address2 = !m.address2 ? "" : m.address2;
          m.phone = !m.phone ? "" : m.phone;
          m.hours = !m.hours ? "" : m.hours;
          m.detailhours = !m.detailhours ? "" : m.detailhours;
          m.monday = m.detailhours.length == 0 ? "" : m.detailhours.toLowerCase().split(weekdays[1])[1].split(weekdays[2])[0];
          m.tuesday = m.detailhours.length == 0 ? "" : m.detailhours.toLowerCase().split(weekdays[2])[1].split(weekdays[3])[0];
          m.wednesday = m.detailhours.length == 0  ? "" : m.detailhours.toLowerCase().split(weekdays[3])[1].split(weekdays[4])[0];
          m.thursday = m.detailhours.length == 0  ? "" : m.detailhours.toLowerCase().split(weekdays[4])[1].split(weekdays[5])[0];
          m.friday = m.detailhours.length == 0  ? "" :  m.detailhours.toLowerCase().split(weekdays[5])[1].split(weekdays[6])[0];
          m.saturday = m.detailhours.length == 0  ? "" : m.detailhours.toLowerCase().split(weekdays[6])[1].split(weekdays[0])[0];
          m.sunday = m.detailhours.length == 0  ? "" : m.detailhours.toLowerCase().split(weekdays[0])[1];
          m.url = !m.url ? "" : m.url;
          m.href = m.url.length != 0 && m.url.indexOf("http://") == -1 ? "http://"+m.url : m.url;

          var $dir = $("<li id='"+m.id+"' data-cat='"+m.categories+"' class='"+m.show+"'>" +
                          "<img class='photo' src='"+m.thumbnail+"'>" +
                          "<ul class='info'>" +
                            "<li><span class='label'></span>"+m.title+"</li>" +
                            "<li>"+m.address+" "+m.address2+"</li>" +
                            "<li>"+m.phone+"</li>" +
                            "<li><a class='site' target='_blank' href='"+m.href+"'>"+m.url+"</a></li>" +
                          "</ul>" +
                        "</li>");
          $directoryList.append($dir);
          $dir.css("opacity", 1);
        });

    $(".directory .info li:first-child, .directory .photo").click(function(){
        var $member = $(this).closest(".directory-list > li");
        members.forEach(function(m){
          if($member[0].id == m.id ) memberSelected(m);
        });
    });
 }

 function memberSelected(m){
  if(selectedMember) selectedMember.marker.selected.setVisible(false);
  selectedMember = m;
  m.marker.selected.setVisible(true);

  var monStr = m.monday.length == 0 ? "" : "<li>Monday:<span class='hours'>"+m.monday+"</span></li>";
  var tuesStr = m.tuesday.length == 0 ? "" : "<li>Tuesday:<span class='hours'>"+m.tuesday+"</span></li>";
  var wedStr = m.wednesday.length == 0 ? "" : "<li>Wednesday:<span class='hours'>"+m.wednesday+"</span></li>";
  var thurStr = m.thursday.length == 0 ? "" : "<li>Thursday:<span class='hours'>"+m.thursday+"</span></li>";
  var friStr = m.friday.length == 0 ? "" : "<li>Friday:<span class='hours'>"+m.friday+"</span></li>";
  var satStr = m.saturday.length == 0 ? "" : "<li>Saturday:<span class='hours'>"+m.saturday+"</span></li>";
  var sunStr = m.sunday.length == 0 ? "" : "<li>Sunday:<span class='hours'>"+m.sunday+"</span></li>";
  var hourStr = monStr + tuesStr + wedStr + thurStr + friStr + satStr + sunStr;

  var descriptionStr = !m.description ? "" : "<p class='description'>"+m.description+"</p>";

  infowindow.setContent("<div class='marker-content'>" +
                          "<ul class='marker-details left'>" +
                            "<li>"+m.title+"</li>" +
                            "<li>"+m.address+"</li>" +
                            "<li>"+m.phone+"</li>" +
                            "<li class='site-container'><a class='site' target='_blank' href='http://"+m.url+"'>"+m.url+"</a></li>" +
                            hourStr +
                          "</ul>" +
                          "<ul class='marker-details right'>"+descriptionStr+"</ul>" +
                        "</div>");

  infowindow.open(map, m.marker.selected);

  var $activeMember = $(".directory-list #"+m.id);
  $(".directory-list > li.selected").removeClass("selected");

  if ($activeMember.length != 0){
      var $directory = $(".directory-list");
      $activeMember.addClass("selected");
      $directory.animate({
        scrollTop: $activeMember.offset().top - $directory.offset().top + $directory.scrollTop()
      },400);
  };

  map.setCenter(m.marker.selected.position);

  if ($(".headline.active").hasClass("contact"))
    map.panBy(LEFT_PAN_IN_PIXELS,DOWN_PAN_IN_PIXELS);
  else if ($(".headline.active").hasClass("directory"))
    map.panBy(RIGHT_PAN_IN_PIXELS,DIRECTORY_DOWN_PAN_IN_PIXELS);
  else
    map.panBy(RIGHT_PAN_IN_PIXELS,DOWN_PAN_IN_PIXELS);
 }

  //read Google Sheet data into an array
  function fetchSheet(url,array,callback){
    $.getJSON(url,function(json){
      parseJSON(json,array);
      if(typeof(callback) == "function") callback();
    });
  }

  //parse cell data into array
  function parseJSON(json,array){
    var data = getCellData(json.feed.entry);
    //parse into useable structure
    var columns = data[0]; //first row contains labels
    for(var row = 1; row < data.length; row++){
      var i = row-1;
      if (typeof data[row] === 'undefined' || typeof data[row][0] === 'undefined') break;
      if(!array[i]) array[i] = {};
      for(var col = 0; col < columns.length; col++){
        var label = columns[col].toLowerCase().replace(/\W/g,'');
        value = data[row][col];
        if(value) array[i][label] = value;
      }
      if(!Object.keys(array[i]).length) array.pop(i);
    }
  }

  //returns data[row][column] from Google JSON cell format
  function getCellData(cells){
    var data = [];
    cells.forEach(function(e){
      var location = e.id.$t.split('/');
      location = (location[location.length-1].split('R')[1]).split('C');
      var row = parseInt(location[0])-1;
      var column = parseInt(location[1])-1;
      if(!data[row]) data[row] = [];
      data[row][column] = e.content.$t;
    });
    return data;
  }

  function closeInfoWindow(){
    if(selectedMember) selectedMember.marker.selected.setVisible(false);
    $(".directory-list > li.selected").removeClass("selected");
    infowindow.close();
  }

  function transitionHeadline(element){
     var $pActive = $(".headline.active");
     var c = $(element).attr('class');
     $pActive.removeClass('active');
     var pc = $pActive.attr('class').replace(/headline/g,"").replace(/\s/g,"");
     $(".headline."+c).addClass('active');
     closeInfoWindow();
     if((c == "directory" || c == "events" ) && !firstResize ) {
        $(window).trigger( "resize" );
        firstResize = true;
     }
     if(c == "directory") labelMarkers();
     else if (pc == "directory") {
        members.forEach(function(m){
           unlabelMarkers(m);
        });
        map.panTo(mapCenter);
        map.setZoom(ZOOM);
     }
  }

  $("#menu-list a").click(function(){
     transitionHeadline(this);
  });

  $("#logo").click(function(){
     transitionHeadline(this);
  });

  $(".explore-form.dir").click(function(){
     $("#menu-list .directory").trigger("click");
  });

  $(".explore-form.ev").click(function(){
     $("#menu-list .events").trigger("click");
  });

  $(".about p a").click(function(){
     $("#menu-list .membership").trigger("click");
  });

  window.onresize = function(e){
     var footerHeight = $footer.outerHeight();
     $headlines.each(function(i,h){
       var headlineHeight = $(this).outerHeight();
       var catHeight = $(this).find(".categories").outerHeight();
       var headerHeight = $(this).find("h1").outerHeight(true);
       var height = headlineHeight - footerHeight - catHeight - headerHeight;
       $(this).find(".list").css("height", height+"px");
     });
  }
  $(".list li.show").css("opacity",1);
});

 function changeList($headline, catId){
   $headline.find(".list > li.selected").removeClass("selected");
   $headline.find(".list li.show").removeClass("show");
   $headline.find(".list > li").filter("[data-cat*='"+catId+"']").addClass("show").animate({opacity:1},400);
   if($headline.hasClass("directory")) labelMarkers(); //only the directory
 }

 function cycleImages(){
   var $active = $('#slideshow .active').css('z-index',3);
   var $next = ($active.next().length > 0) ? $active.next() : $('#slideshow a:first');
   $next.css('z-index',2);//move the next image up the pile
   $active.fadeOut(1500,function(){//fade out the top image
     $active.css('z-index',1).show().removeClass('active');//reset the z-index and unhide the image
     $next.css('z-index',3).addClass('active');//make the next image the top one
   });
 }

 function labelMarkers(){
    var cat = $(".directory-cat .selected").data("cat");
    var bounds = new google.maps.LatLngBounds();
    var found = -1;
    members.forEach(function(m){
        if (m.categories.indexOf(cat) != -1){
            found++;
            setLabel(m,found);
            m.marker.labelled.setVisible(true);
            bounds.extend(m.marker.labelled.position);
            map.fitBounds(bounds);
        }
        else unlabelMarkers(m);
    });
    if(!bounds.isEmpty()){
        map.fitBounds(bounds);
        map.setZoom(DEFAULT_DIRECTORY_ZOOM);
        map.panTo(bounds.getSouthWest());
    }
 }

 function unlabelMarkers(m){
    m.marker.selected.labelContent = "";
    m.marker.labelled.labelContent = "";
    m.marker.labelled.setVisible(false);
    m.marker.selected.setVisible(false);
 }

 //Nice Hack...but whatever
 function setLabel(m,index){
    if( index < NUM_CHARS){
        m.marker.labelled.labelContent = m.marker.selected.labelContent = getChar(index);
        m.marker.labelled.labelAnchor = m.marker.selected.labelAnchor = oneLetterlabelAnchor;
    }
    else if ( index >= NUM_CHARS && index < NUM_CHARS_X2) {
        var reset = index - NUM_CHARS;
        m.marker.labelled.labelContent = m.marker.selected.labelContent = "A" + getChar(reset);
        m.marker.labelled.labelAnchor = m.marker.selected.labelAnchor = twoLetterlabelAnchor;
    }
    else{ //hopefully we will never need to go over 78 places in a single category
        var reset = index - NUM_CHARS_X2;
        m.marker.labelled.labelContent = m.marker.selected.labelContent = "B" + getChar(reset);
        m.marker.labelled.labelAnchor = m.marker.selected.labelAnchor = twoLetterlabelAnchor;
    }

    $(".directory #"+m.id).find(".label").text(m.marker.labelled.labelContent+". ");
 }

 function className(text){
    return text.replace(/\W/g, '').toLowerCase();
 }

 function getChar(n) {
    return String.fromCharCode(FIRST_CHAR_CODE + n);
 }

 function compare(a,b) {
    if (a.title < b.title)
        return -1;
    if (a.title > b.title)
        return 1;
    return 0;
 }

 function compareByDate(a,b){
    if( !a.startdate && !b.startdate)
        return 0;
    if (!a.startdate)
        return -1;
    if (!b.startdate)
        return 1;

    var aStartDate = new Date(a.startdate);
    var bStartDate = new Date(b.startdate);

    if (aStartDate <  bStartDate)
      return -1;
    if (aStartDate > bStartDate)
      return 1;
    return 0;
 }
