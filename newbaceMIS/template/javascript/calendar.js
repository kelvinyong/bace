$(document).ready(function() {
	var created = false;
	$('#bookingForm').submit(function(event){
		//save booking to database
		$.post("/json", booking);
		return true;
     //event.preventDefault();
	});//KELVIN
	
   var $calendar = $('#calendar');
   var id = 10;

   $calendar.weekCalendar({
      timeslotsPerHour : 1,
      allowCalEventOverlap : false,
      overlapEventsSeparate: false,
      firstDayOfWeek : 1,
      businessHours :{start: 9, end: 18, limitDisplay: true },
      daysToShow : 6,
      height : function($calendar) {
         return $(window).height() - $(".sidebar").outerHeight()/9 - 1;
      },
      eventRender : function(calEvent, $event) {
    	  if ((calEvent.start < new Date()) || calEvent.readOnly) {//KELVIN timing issue?
            $event.css("backgroundColor", "#aaa");
            $event.find(".wc-time").css({
               "backgroundColor" : "#999",
               "border" : "1px solid #888"
            });
         }else if(user_var.email == calEvent.email){//KELVIN!!!
        	 $event.css("backgroundColor", "#FFFF00");
         }
         
      },
      draggable : function(calEvent, $event) {
         return false;
      },
      resizable : function(calEvent, $event) {
         return false;
      },
      eventNew : function(calEvent, $event) {
    	 if((booking_quota < 2 || created)|| user_var.accounType == 'administrator'){
    		 var $dialogContent = $("#event_edit_container");
	         resetForm($dialogContent);
	         var displaystartTime;
			 var displayendTime;
		 
			 if(calEvent.start.getHours()>12){
				displaystartTime = calEvent.start.getHours()-12 + ":00 pm";
			 }else {
				displaystartTime = calEvent.start.getHours() + ":00 am";
			 }
			 
			 if(calEvent.end.getHours()>12){
				displayendTime = calEvent.end.getHours()-12 + ":00 pm";
			 }else {
				displayendTime = calEvent.end.getHours() + ":00 am";
			 }
		 
	         var startField = $dialogContent.find("input[name='start']").val(displaystartTime);
	         var endField = $dialogContent.find("input[name='end']").val(displayendTime);
	         var titleField = $dialogContent.find("input[name='title']");
	         var bodyField = $dialogContent.find("textarea[name='body']");


	         $dialogContent.dialog({
	            modal: true,
	            title: "New Appointment",
	            close: function() {
	               $dialogContent.dialog("destroy");
	               $dialogContent.hide();
	               $('#calendar').weekCalendar("removeUnsavedEvents");
	            },
	            buttons: {
	               save : function() {
	                  calEvent.id = id;
	                  id++;
	                  calEvent.start = new Date(calEvent.start);
	                  calEvent.end = new Date(calEvent.end);
	                  calEvent.title = titleField.val();
	                  calEvent.body = bodyField.val();
	
	                  $calendar.weekCalendar("removeUnsavedEvents");
	                  $calendar.weekCalendar("updateEvent", calEvent);
	                  
	                  //KELVIN
	                  if(created && (user_var.accounType != 'administrator')){
	                	  $calendar.weekCalendar("removeEvent", calEvent.id -1);
	                	  $.post("/removeCacheBooking",booking);
	                	  //remove recommended slot
	                  }
	                  
	                  booking = {
	                			'id':calEvent.id,
	                			'content': calEvent.body,
	                			'day': calEvent.start.getDate(),
	                			'month': calEvent.start.getMonth()+1,
	                			'year': calEvent.start.getFullYear(),
	                			'start': calEvent.start.getHours(),
	                			'end': calEvent.end.getHours(),
	                			'email': user_var.email,
	                			'type': 'appointment'
	                		}
	                  console.log(booking);
	                		$.post("/cacheBooking", booking,function(data){
	                			alert(data.msg);
	                			created=true;
	                			booking_quota++;
	                			if(data.exist){
	                				getUpdates();
	                				$calendar.weekCalendar("removeEvent", calEvent.id);
	                			}
	                		}, "json");
	                  
	                  $dialogContent.dialog("close");
	               },
	               cancel : function() {
	                  $dialogContent.dialog("close");
	               }
	            }
	         }).show();
	    	  
	         $dialogContent.find(".date_holder").text($calendar.weekCalendar("formatDate", calEvent.start));
    	  }else{
    		  	$calendar.weekCalendar("removeUnsavedEvents");
    		  }
      },
      eventDrop : function(calEvent, $event) {
      },
      eventResize : function(calEvent, $event) {
      },
      eventClick : function(calEvent, $event) {

         if (calEvent.readOnly) {
            return;
         }

         var $dialogContent = $("#event_edit_container");
         resetForm($dialogContent);
         var displaystartTime;
		 var displayendTime;
		 
		 if(calEvent.start.getHours()>12){
			displaystartTime = calEvent.start.getHours()-12 + ":00 pm";
		 }else {
			displaystartTime = calEvent.start.getHours() + ":00 am";
		 }
		 
		 if(calEvent.end.getHours()>12){
			displayendTime = calEvent.end.getHours()-12 + ":00 pm";
		 }else {
			displayendTime = calEvent.end.getHours() + ":00 am";
		 }
		 
         var startField = $dialogContent.find("input[name='start']").val(displaystartTime);
         var endField = $dialogContent.find("input[name='end']").val(displayendTime);
         var titleField = $dialogContent.find("input[name='title']").val(calEvent.title);
         var bodyField = $dialogContent.find("textarea[name='body']");
         bodyField.val(calEvent.body);
         
         if(user_var.accounType == 'administrator'){
        	 $dialogContent.dialog({
                 modal: true,
                 title: "View Appointment",
                 close: function() {
                    $dialogContent.dialog("destroy");
                    $dialogContent.hide();
                    $('#calendar').weekCalendar("removeUnsavedEvents");
                 },
                 buttons: {
                    "delete" : function() {
                       $calendar.weekCalendar("removeEvent", calEvent.id);
                       $dialogContent.dialog("close");
                    },
                    cancel : function() {
                       $dialogContent.dialog("close");
                    }
                 }
              }).show();
         }else{
        	 $dialogContent.dialog({
            modal: true,
            title: "View Appointment",
            close: function() {
               $dialogContent.dialog("destroy");
               $dialogContent.hide();
               $('#calendar').weekCalendar("removeUnsavedEvents");
            },
            buttons: {
               cancel : function() {
                  $dialogContent.dialog("close");
               }
            }
         }).show();
         }

         

         $dialogContent.find(".date_holder").text($calendar.weekCalendar("formatDate", calEvent.start));
         $(window).resize().resize(); //fixes a bug in modal overlay size ??

      },
      eventMouseover : function(calEvent, $event) {
      },
      eventMouseout : function(calEvent, $event) {
      },
      noEvents : function() {

      },
      data : function(start, end, callback) {
         callback(getEventData());
      }
   });

   function resetForm($dialogContent) {
      $dialogContent.find("input").val("");
      $dialogContent.find("textarea").val("");
   }

   function getEventData() {
	  var date = new Date();
      date.setDate(date.getDate()+6);
      var year = date.getFullYear();
      var month = date.getMonth();
      
      var hour = new Date().getHours();
      var unavailableList = []
      var id=1;
      var now = false;
      //KELVIN
      if(user_var.accounType != 'administrator'){
	      for(var m=4;m <= month; m++){
	    	  var days = new Date(year,m+1,0).getDate();
	    	  for(var d=1;d <= days; d++){
	    		  for(var t=9;t <18; t++){
	    			  if(m == month && d == date.getDate()){
	    				  now = true;
		    			  break;
		    		  }
	    			  //console.log(d+':'+date+':'+m+':'+month+':'+hour);
		    		  id += allEvent.length;
		        	  unavailableEvent ={};
		        	  unavailableEvent['id'] = id;
		        	  unavailableEvent['start'] = new Date(year,m,d,t);
		        	  unavailableEvent['end'] = new Date(year,m,d,t+1);
		        	  unavailableEvent['title'] = 'unavailable'
		        	  unavailableEvent['readOnly'] = true
		        	  unavailableEvent['type'] = 'unavailable';
		        	  
		        	  var exist = false;
		        	  for(var i =0; i<allEvent.length;i++){
		        		  if((allEvent[i]['start'].getDate() == unavailableEvent['start'].getDate()) && 
		        				  (allEvent[i]['start'].getFullYear() == unavailableEvent['start'].getFullYear()) &&
		        				  	(allEvent[i]['start'].getMonth() == unavailableEvent['start'].getMonth()) && 
		        				  		(allEvent[i]['start'].getHours() == unavailableEvent['start'].getHours())){
		        			  t += (allEvent[i]['end'].getHours()-allEvent[i]['start'].getHours())-1;
		        			  //check for end date as well to cater for 2 hour slot
		        			  exist = true;
		        		  }
		        	  }
		        	  if(!exist)unavailableList.push(unavailableEvent);
		        	  
	        	  }
	    		  if(now) break;
	          }
	    	  if(now) break;
	      }
      }
      
      lol();
      return {
         events : allEvent.concat(unavailableList)
      };
   }


   /*
    * Sets up the start and end time fields in the calendar event
    * form for editing based on the calendar event being edited
    *///KELVIN maybe delete this function
   function setupStartAndEndTimeFields($startTimeField, $endTimeField, calEvent, timeslotTimes) {

      for (var i = 0; i < timeslotTimes.length; i++) {
         var startTime = timeslotTimes[i].start;
         var endTime = timeslotTimes[i].end;
         var startSelected = "";
         if (startTime.getTime() === calEvent.start.getTime()) {
            startSelected = "selected=\"selected\"";
         }
         var endSelected = "";
         if (endTime.getTime() === calEvent.end.getTime()) {
            endSelected = "selected=\"selected\"";
         }
         $startTimeField.append("<option value=\"" + startTime + "\" " + startSelected + ">" + timeslotTimes[i].startFormatted + "</option>");
         $endTimeField.append("<option value=\"" + endTime + "\" " + endSelected + ">" + timeslotTimes[i].endFormatted + "</option>");

      }
      $endTimeOptions = $endTimeField.find("option");
      $startTimeField.trigger("change");
   }

   var $endTimeField = $("select[name='end']");
   var $endTimeOptions = $endTimeField.find("option");

   //reduces the end time options to be only after the start time options.
   $("select[name='start']").change(function() {
      var startTime = $(this).find(":selected").val();
      var currentEndTime = $endTimeField.find("option:selected").val();
      $endTimeField.html(
            $endTimeOptions.filter(function() {
               return startTime < $(this).val();
            })
            );

      var endTimeSelected = false;
      $endTimeField.find("option").each(function() {
         if ($(this).val() === currentEndTime) {
            $(this).attr("selected", "selected");
            endTimeSelected = true;
            return false;
         }
      });

      if (!endTimeSelected) {
         //automatically select an end date 2 slots away.
         $endTimeField.find("option:eq(1)").attr("selected", "selected");
      }

   });


});