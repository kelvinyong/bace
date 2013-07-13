$(document).ready(function() {
	var created = false;
	$('#bookingForm').submit(function(event){
		//save booking to database
		clickSubmit=true;
		event.preventDefault();
		$.post("/json", selectedBooking).done(function(){
			$('#bookingForm').unbind('submit').submit();
		});
     
	});//KELVIN
	
	$('#adminbookingForm').submit(function(event){
		//save booking to database
		clickSubmit=true;
		event.preventDefault();
		$.post("/admin/jsonEditBooking").done(function(){
			$('#adminbookingForm').unbind('submit').submit();
		});
	});//KELVIN
	
   var $calendar = $('#calendar');
   var id = allEvent.length+1;

   $calendar.weekCalendar({
      timeslotsPerHour : 1,
      allowCalEventOverlap : false,
      overlapEventsSeparate: false,
      firstDayOfWeek : 1,
      businessHours :{start: 9, end: 18, limitDisplay: true },
      daysToShow : 6,
      height : function($calendar) {
         return 560;
      },
      eventRender : function(calEvent, $event) {
    	  if ((calEvent.start < new Date()) || calEvent.readOnly) {
            $event.css("backgroundColor", "#aaa");
            $event.find(".wc-time").css({
               "backgroundColor" : "#999",
               "border" : "1px solid #888"
            });
         }else if(user_var.email == calEvent.email){//personal booking
        	 $event.css("backgroundColor", "#FF0000");
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
		 
			 if(user_var.accounType == 'administrator'){
				 var startField = $dialogContent.find("select[name='start']").val(calEvent.start);
		         var endField = $dialogContent.find("select[name='end']").val(calEvent.end);
			 }else{
				 var startField = $dialogContent.find("input[name='start']").val(displaystartTime);
				 var endField = $dialogContent.find("input[name='end']").val(displayendTime);
			 }
	         
	         var servicetypeField = $dialogContent.find("input[name='servicetype']").val(user_var.servicetype);
	         var bodyField = $dialogContent.find("textarea[name='body']").val(user_var.description);
	         var emailField = $dialogContent.find("input[name='email']").val(user_var.email);
        	 var pcField = $dialogContent.find("input[name='postalcode']").val(user_var.postalcode);
        	 

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
	                  if(user_var.accounType == 'administrator'){ 
	                	  id++;
	                	  calEvent.start = new Date(startField.val());
	                      calEvent.end = new Date(endField.val());
	                      calEvent.postalcode = pcField.val();
	                	  calEvent.email = emailField.val();
	                  }else{
	                	  calEvent.start = new Date(calEvent.start);
	                	  calEvent.end = new Date(calEvent.end);
	                	  calEvent.postalcode = user_var.postalcode;
	                	  calEvent.email = user_var.email;
	                  }
	                  calEvent.servicetype = servicetypeField.val();
	                  calEvent.description = bodyField.val();
	                  calEvent.type = "appointment";
	                  
	
	                  $calendar.weekCalendar("removeUnsavedEvents");
	                  
	                  //KELVIN
	                  if(created && (user_var.accounType != 'administrator')){
	                	  //$calendar.weekCalendar("removeEvent", calEvent.id -1);
	                	  //allEvent.pop(calEvent);
	                	  for(var i=0; i<allEvent.length; i++){
	                		  if((allEvent[i].type == "appointment" && allEvent[i].email == user_var.email) || (allEvent[i].type == "query" && (!allEvent[i].readOnly) && allEvent[i].email == user_var.email)){
	                			  console.log(allEvent);
	                			  console.log(allEvent[i].id);
	                			  $calendar.weekCalendar("removeEvent", allEvent[i].id);
	                			  allEvent.splice(i, 1);
	                			  break;
	                		  }
	                	  }
	                	  $.post("/removeCacheBooking",selectedBooking);
	                	  //remove recommended slot
	                  }
	                  allEvent.push(calEvent);
	                  
	                  selectedBooking = {
	                			'id': calEvent.id,
	                			'day': calEvent.start.getDate(),
	                			'month': calEvent.start.getMonth()+1,
	                			'year': calEvent.start.getFullYear(),
	                			'start': calEvent.start.getHours(),
	                			'end': calEvent.end.getHours(),
	                			'servicetype': calEvent.servicetype,
	                			'email': calEvent.email,
	                			'postalcode': calEvent.postalcode,
	                			'description': calEvent.description,
	                			'type': 'appointment'
	                		}
	                  
	                  if(user_var.accounType == 'administrator') selectedBooking.type = 'administrator';
	                  
	                  console.log(selectedBooking);
	                		$.post("/cacheBooking", selectedBooking,function(data){
	                			alert(data.msg);
	                			created=true;
	                			booking_quota++;
	                			if(data.exist){
	                				selectedBooking = {};
	                				//$calendar.weekCalendar("removeEvent", calEvent.id);
	                			}else $calendar.weekCalendar("updateEvent", calEvent);
	                		}, "json");
	                  adminBooking.push(selectedBooking);
	                  getUpdates();
	                  $dialogContent.dialog("close");
	               },
	               cancel : function() {
	                  $dialogContent.dialog("close");
	               }
	            }
	         }).show();
	    	  
	         $dialogContent.find(".date_holder").text($calendar.weekCalendar("formatDate", calEvent.start));
	         setupStartAndEndTimeFields(startField, endField, calEvent, $calendar.weekCalendar("getTimeslotTimes", calEvent.start));
    	  }else{
    		  	$calendar.weekCalendar("removeUnsavedEvents");
    		  }
    	 //$dialogContent.find(".date_holder").text($calendar.weekCalendar("formatDate", calEvent.start));
    	 
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
         var servicetypeField = $dialogContent.find("input[name='servicetype']").val(calEvent.servicetype);
         var bodyField = $dialogContent.find("textarea[name='body']").val(calEvent.description);
         
         if(user_var.accounType == 'administrator'){
        	 var emailField = $dialogContent.find("input[name='email']").val(calEvent.email);//KELVIN
        	 var pcField = $dialogContent.find("input[name='postalcode']").val(calEvent.postalcode);
        	 $dialogContent.dialog({
                 modal: true,
                 title: "View Appointment",
                 close: function() {
                    $dialogContent.dialog("destroy");
                    $dialogContent.hide();
                    $('#calendar').weekCalendar("removeUnsavedEvents");
                 },
                 buttons: {
                	 save : function() {
                		 calEvent.start = new Date(startField.val());
                         calEvent.end = new Date(endField.val());
                         calEvent.servicetype = servicetypeField.val();
                         calEvent.description = bodyField.val();
                         calEvent.postalcode = pcField.val();
                         calEvent.email = emailField.val();
                         
                         
                         selectedBooking = {
 	                			'id': calEvent.id,
 	                			'day': calEvent.start.getDate(),
 	                			'month': calEvent.start.getMonth()+1,
 	                			'year': calEvent.start.getFullYear(),
 	                			'start': calEvent.start.getHours(),
 	                			'end': calEvent.end.getHours(),
 	                			'servicetype': calEvent.servicetype,
 	                			'email': calEvent.email,
 	                			'postalcode': calEvent.postalcode,
 	                			'description': calEvent.description,
 	                			'type': 'administrator',
 	                			'task': 'edit',
 	                			'key': calEvent.key
 	                		}
                         //since here only administrator
                         
                         $.post("/cacheBooking", selectedBooking,function(data){
	                			alert('appointment will be modified upon save');
	                		}, "json");

                         $calendar.weekCalendar("updateEvent", calEvent);
                         $dialogContent.dialog("close");
                	 },
                    "delete" : function() {
                       for(var i=0; i<adminBooking.length; i++){
	                		  if((adminBooking[i].year == calEvent.start.getFullYear()) &&
	                				  (adminBooking[i].month == calEvent.start.getMonth()+1) &&
	                				  		(adminBooking[i].day == calEvent.start.getDate()) &&
	                				  			(adminBooking[i].start == calEvent.start.getHours())){
	                			  $calendar.weekCalendar("removeEvent", calEvent.id);
	                			  $.post("/removeCacheBooking",adminBooking[i]);
	                			  adminBooking.splice(i, 1);
	                			  break;
	                		  }
	                	  }
                       
                       $.post("/admin/jsonDeleteBooking", {key: calEvent.key},function(data){
                    	   $calendar.weekCalendar("removeEvent", calEvent.id);
                    	   allEvent.pop(calEvent);
                    	   alert(data.msg);
               			}, "json");
                       getUpdates();
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

         
         var startField = $dialogContent.find("select[name='start']").val(calEvent.start);
         var endField = $dialogContent.find("select[name='end']").val(calEvent.end);
         $dialogContent.find(".date_holder").text($calendar.weekCalendar("formatDate", calEvent.start));
         setupStartAndEndTimeFields(startField, endField, calEvent, $calendar.weekCalendar("getTimeslotTimes", calEvent.start));
         $(window).resize().resize();

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
      $dialogContent.find("select option").remove();
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
		    		  id += allEvent.length;
		        	  unavailableEvent ={};
		        	  unavailableEvent['id'] = id;
		        	  unavailableEvent['start'] = new Date(year,m,d,t);
		        	  unavailableEvent['end'] = new Date(year,m,d,t+1);
		        	  unavailableEvent['servicetype'] = 'unavailable'
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