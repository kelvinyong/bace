#!/usr/bin/env python

from google.appengine.ext.webapp import template
from google.appengine.api import mail
from google.appengine.ext import ndb
from google.appengine.ext import db
from datetime import datetime, date, time
import models
import json

import logging
import os.path
import webapp2

from webapp2_extras import auth
from webapp2_extras import sessions

from webapp2_extras.auth import InvalidAuthIdError
from webapp2_extras.auth import InvalidPasswordError


# A list storing the booking cache.
booking_cache = []
day = 15

def user_required(handler):
    """
        Decorator that checks if there's a user associated with the current session.
        Will also fail if there's is session present.
    """
    def check_login(self, *args, **kwargs):
        auth = self.auth
        if not auth.get_user_by_session():
            self.redirect(self.uri_for('login'), abort=True)
        else:
            return handler(self, *args, **kwargs)
        
    return check_login
  

def admin_required(handler):
    """
        Decorator that checks if there's a admin associated with the current session.
        Will redirect to home page if fail
    """
    def check_login(self,*args, **kwargs):
        if self.user.accounType == 'administrator':
            return handler(self, *args, **kwargs)
        else:
            self.redirect(self.uri_for('home'), abort=True)
            
    return check_login
    
def loggedin(handler):
    """
        Decorator that checks if there's a user associated with the current session.
        Will also fail if there's is session present.
    """
    def check_login(self, *args, **kwargs):
        auth = self.auth
        if not auth.get_user_by_session():
            return handler(self, *args, **kwargs)
        else:
            self.redirect(self.uri_for('home'), abort=True)
            
    return check_login

def getKey(self):
    """
        return key of data being accessed
    """
    if self.user.accounType == 'administrator' or self.user.accounType == 'employee':
        info = (db.GqlQuery("SELECT * FROM Staff where Email = :email", email = self.user.email_address)).get()
    else:
        info = (db.GqlQuery("SELECT * FROM Customer where Email = :email", email = self.user.email_address)).get()
        
    key = info.key()
    return key


class VerifiedError(Exception):
    """
        custom exception
        Raised when a user has not verified email
    """

class BaseHandler(webapp2.RequestHandler):
  @webapp2.cached_property
  def auth(self):
    """Shortcut to access the auth instance as a property."""
    return auth.get_auth()

  @webapp2.cached_property
  def user_info(self):
    """Shortcut to access a subset of the user attributes that are stored
    in the session.

    The list of attributes to store in the session is specified in
      config['webapp2_extras.auth']['user_attributes'].
    :returns
      A dictionary with most user information
    """
    return self.auth.get_user_by_session()

  @webapp2.cached_property
  def user(self):
    """Shortcut to access the current logged in user.

    Unlike user_info, it fetches information from the persistence layer and
    returns an instance of the underlying model.

    :returns
      The instance of the user model associated to the logged in user.
    """
    u = self.user_info
    return self.user_model.get_by_id(u['user_id']) if u else None

  @webapp2.cached_property
  def user_model(self):
    """Returns the implementation of the user model.

    It is consistent with config['webapp2_extras.auth']['user_model'], if set.
    """    
    return self.auth.store.user_model

  @webapp2.cached_property
  def session(self):
      """Shortcut to access the current session."""
      return self.session_store.get_session(backend="datastore")

  def render_template(self, view_filename, params={}):
    user = self.user_info
    params['user'] = user
    path = os.path.join(os.path.dirname(__file__), 'template', view_filename)
    self.response.out.write(template.render(path, params))

  def display_message(self, message):
    """Utility function to display a template with a simple message."""
    params = {
      'message': message
    }
    self.render_template('message.html', params)

  # this is needed for webapp2 sessions to work
  def dispatch(self):
      # Get a session store for this request.
      self.session_store = sessions.get_store(request=self.request)

      try:
          # Dispatch the request.
          webapp2.RequestHandler.dispatch(self)
      finally:
          # Save all sessions.
          self.session_store.save_sessions(self.response)

class MainHandler(BaseHandler):
    def get(self):
        self.render_template('home.html')

class SignupHandler(BaseHandler):
  @loggedin
  def get(self):
    self.render_template('signup.html')

  def post(self):
    email = self.request.get('email')
    password = self.request.get('password')
    auth = self.auth
    
    if not auth.get_user_by_session():
        accType = 'customer'
        customer = models.Customer()
    else:
        accType = self.request.get('accType')
        customer = models.Staff()
    
    customer.Email = email
    customer.First_Name = self.request.get('firstname')
    customer.Last_Name = self.request.get('lastname')
    customer.Contact_No = int(self.request.get('contact'))
    customer.Address = self.request.get('address')
    #customer.latest_location # use google map got coordinate?

    #unique_properties = ['email_address']
    acct_data = self.user_model.create_user(email, email_address=email, password_raw=password, first_name=customer.First_Name, accounType = accType, verified=False)
        
    if not mail.is_email_valid(email):
        self.display_message('invalid email entered')
        return
    
    if not acct_data[0]: #acct_data is a tuple
        self.display_message('Unable to create user for email %s because of \
            duplicate keys %s' % (email, acct_data[1]))
        return
    
    customer.put()
    user = acct_data[1]
    user_id = user.get_id()

    token = self.user_model.create_signup_token(user_id)

    verification_url = self.uri_for('verification', type='v', user_id=user_id,
      signup_token=token, _full=True)

    msg = 'Send an email to user in order to verify their address. \
          They will be able to do so by visiting <a href="{url}">{url}</a>'
          
    message = mail.EmailMessage()
    message.sender = 'postmaster@billyacemis.appspotmail.com'
    message.to = email
    message.body = """
        testing email
        %s
        """ % msg.format(url=verification_url)
    message.Send()

    self.display_message(msg.format(url=verification_url))

class ForgotPasswordHandler(BaseHandler):
  def get(self):
    self._serve_page()

  def post(self):
    email = self.request.get('email')

    user = self.user_model.get_by_auth_id(email)
    if not user:
      logging.info('Could not find any user entry for email %s', email)
      self._serve_page(not_found=True)
      return

    user_id = user.get_id()
    token = self.user_model.create_signup_token(user_id)

    verification_url = self.uri_for('verification', type='p', user_id=user_id,
      signup_token=token, _full=True)

    msg = 'Send an email to user in order to reset their password. \
          They will be able to do so by visiting <a href="{url}">{url}</a>'
          
    message = mail.EmailMessage()
    message.sender = 'postmaster@billyacemis.appspotmail.com'
    message.to = email
    message.body = """
        testing email
        %s
        """ % msg.format(url=verification_url)
    message.Send()

    self.display_message(msg.format(url=verification_url))
  
  def _serve_page(self, not_found=False):
    email = self.request.get('email')
    params = {
      'email': email,
      'not_found': not_found
    }
    self.render_template('forgot.html', params)


class VerificationHandler(BaseHandler):
  def get(self, *args, **kwargs):
    user = None
    user_id = kwargs['user_id']
    signup_token = kwargs['signup_token']
    verification_type = kwargs['type']

    # it should be something more concise like
    # self.auth.get_user_by_token(user_id, signup_token
    # unfortunately the auth interface does not (yet) allow to manipulate
    # signup tokens concisely
    user, ts = self.user_model.get_by_auth_token(int(user_id), signup_token,
      'signup')

    # store user data in the session
    self.auth.set_session(self.auth.store.user_to_dict(user), remember=True)

    if not user:
      logging.info('Could not find any user with id "%s" signup token "%s"',
        user_id, signup_token)
      self.abort(404)

    if verification_type == 'v':
      # remove signup token, we don't want users to come back with an old link
      self.user_model.delete_signup_token(user.get_id(), signup_token)

      if not user.verified:
        user.verified = True
        user.put()

      self.display_message('User email address has been verified.')
      return
    elif verification_type == 'p':
      # supply user to the page
      params = {
        'user': user,
        'token': signup_token
      }
      self.render_template('resetpassword.html', params)
    else:
      logging.info('verification type not supported')
      self.abort(404)

class SetPasswordHandler(BaseHandler):
    @user_required
    def post(self):
        password = self.request.get('password')
        old_token = self.request.get('t')
    
        if not password or password != self.request.get('confirm_password'):
            self.display_message('passwords do not match')
            return
    
        user = self.user
        user.set_password(password)
        user.put()
    
        # remove signup token, we don't want users to come back with an old link
        self.user_model.delete_signup_token(user.get_id(), old_token)
        
        self.display_message('Password updated')

class LoginHandler(BaseHandler):
  @loggedin
  def get(self):
    self._serve_page()

  def post(self):
    email = self.request.get('email')
    password = self.request.get('password')
    try:
        self.auth.get_user_by_password(email, password, remember=True,
                                           save_session=True)
        if not self.user.verified:
            raise VerifiedError()
        else:
            self.redirect(self.uri_for('home'))
    except (InvalidAuthIdError, InvalidPasswordError) as e:
      logging.info('Login failed for user %s because of %s', email, type(e))
      self._serve_page(True)
    except VerifiedError:
        self.auth.unset_session()
        self.redirect(self.uri_for('verifyemail'))
        """ask user to verify their email or resend verification got render bug"""

  def _serve_page(self, failed=False):
    email = self.request.get('email')
    params = {
      'email': email,
      'failed': failed
    }
    self.render_template('login.html', params)

class LogoutHandler(BaseHandler):
    def get(self):
        global booking_cache
        global day
        self.auth.unset_session()
        booking_cache = []
        day=15
        self.redirect(self.uri_for('home'))
        
class SettingHandler(BaseHandler):
    @user_required
    def get(self):
        if self.user.accounType == 'administrator' or self.user.accounType == 'employee':
            info = (db.GqlQuery("SELECT * FROM Staff where Email = :email", email = self.user.email_address)).get()
        else:
            info = (db.GqlQuery("SELECT * FROM Customer where Email = :email", email = self.user.email_address)).get()
        
        params = {
                  'email': info.Email,
                  'firstname': info.First_Name,
                  'lastname': info.Last_Name,
                  'contact': info.Contact_No,
                  'address': info.Address
                  }
        self.render_template('setting.html', params)
    
    def post(self):
        if self.user.accounType == 'administrator' or self.user.accounType == 'employee':
            info = models.Staff.get(getKey(self))
        else:
            info = models.Customer.get(getKey(self))
            
        info.Email = self.request.get('email')
        info.First_Name = self.request.get('firstname')
        info.Last_Name = self.request.get('lastname')
        info.Contact_No = int(self.request.get('contact'))
        info.Address = self.request.get('address')
        info.put()
        self.display_message('Settings updated')


class AuthenticatedHandler(BaseHandler):
    @user_required
    def get(self):
        self.render_template('authenticated.html')

class AdminSignupHandler(BaseHandler):
    @user_required
    @admin_required
    def get(self):
        self.render_template('signup.html')
        

class dbHandler(BaseHandler):
    def get(self):
        greetings = db.GqlQuery("SELECT * FROM Greeting")
        #greetings = Greeting.all()
        for greeting in greetings:
            self.response.write('<li> %s date/time %s' % (greeting.content, greeting.date))
        self.response.write('''
            </ol><hr>
            <form action="/sign" method=post>
            <textarea name=content rows=3 cols=60></textarea>
            <br><input type=submit value="Sign Guestbook">
            </form>
        ''')
        
class GuestBook(BaseHandler):
    def post(self):
        greeting = models.Greeting()
        greeting.content = self.request.get('content')
        greeting.put()
        self.redirect(self.uri_for('test'))

class VerifyHandler(BaseHandler):
    @loggedin
    def get(self):
        self._serve_page()       
        
    def post(self):
        email = self.request.get('email')
        user = self.user_model.get_by_auth_id(email)
        if not user:
            logging.info('Not a valid email %s', email)
            self._serve_page(not_found=True)
            return
        
        user_id = user.get_id()
        token = self.user_model.create_signup_token(user_id)
        
        verification_url = self.uri_for('verification', type='v', user_id=user_id,
          signup_token=token, _full=True)
    
        msg = 'Send an email to user in order to verify their address. \
              They will be able to do so by visiting <a href="{url}">{url}</a>'
              
        message = mail.EmailMessage()
        message.sender = 'postmaster@billyacemis.appspotmail.com'
        message.to = email
        message.body = """
            testing email
            %s
            """ % msg.format(url=verification_url)
        message.Send()
    
        self.display_message(msg.format(url=verification_url))
        
    def _serve_page(self, not_found=False):
        email = self.request.get('email')
        params = {
                  'email': email,
                  'not_found': not_found
                  }
        self.render_template('verifyemail.html', params)


class QueryScheduleHandler(BaseHandler):
    @user_required
    def get(self):
        self.render_template('booking.html')
        
    def post(self):
        global booking_cache
        global day
        #.. send information to database first to calculate recommendation
        #create one cache for recommendation
        schedule={}
        schedule['type'] = 'recommendation'
        schedule['content'] = 'Appointment Recommendation'
        schedule['email'] = self.user.email_address
        date={}
        date['day'] = day
        date['month'] = 7
        date['year'] = 2013
        schedule['date'] = date
        hour={}
        hour['start'] = 15
        hour['end'] = 16
        schedule['hour'] = hour
        schedule['readonly'] = False
        
        booking_cache.append(schedule)
        day +=1
        self.render_template('schedule.html')
        
class ScheduleHandler(BaseHandler):
    def post(self):
        #save info toconfirm booking
        #params={}
        #data = json.loads(data)
        #params['info'] = self.request.get('id');
        
        self.display_message('Saved Booking')


class jsonHandler(BaseHandler):
    def get(self):
        global booking_cache
        
        jobs = db.GqlQuery("SELECT * FROM Job")
        #need to set a where clause for job i.e. no point showing 
        params = {}
        params['schedule'] = []
        for job in jobs:
            schedule={}
            schedule['type'] = 'query'
            if(self.user.email_address == job.Email):
                schedule['email'] = job.Email
            schedule['content'] = job.Description
            date={}
            date['day'] = job.StartDate.day
            date['month'] = job.StartDate.month
            date['year'] = job.StartDate.year
            schedule['date'] = date
            hour={}
            hour['start'] = job.StartDate.hour
            hour['end'] = job.EndDate.hour
            schedule['hour'] = hour
            schedule['readonly'] = False
            if(job.StartDate < datetime.now() or self.user.email_address != job.Email):
                schedule['readonly'] = True
            params['schedule'].append(schedule)
            
        for cache in booking_cache:
            if(self.user.email_address == cache['email']):
                cache['readonly'] = False
                params['schedule'].append(cache)
            else:
                cache['readonly'] = True
                temp = cache['email']
                cache['email'] = None
                params['schedule'].append(cache)
                cache['email'] = temp
        
        #params['schedule'] += booking_cache#loop booking_cache than check email than set readonly to true so unauthorize ppl cannot click
        
        self.response.out.write(json.JSONEncoder().encode(params));
        
    def post(self):
        #save booking into database
        d = date(int(self.request.get('year')), int(self.request.get('month')), int(self.request.get('day')))
        st = time(int(self.request.get('start')))
        et = time(int(self.request.get('end')))
        datetime.combine(d, st)
        
        job = models.Job()
        job.Email = self.user.email_address
        job.Description = self.request.get('content')
        job.StartDate = datetime.combine(d, st)
        job.EndDate = datetime.combine(d, et)
        job.put()
        
        
class cacheHandler(BaseHandler):
    def post(self):
        global booking_cache
        data={}
        data['id'] = self.request.get('id')
        
        schedule={}
        schedule['type'] = self.request.get('type')
        schedule['email'] = self.user.email_address
        schedule['content'] = self.request.get('content')
        date={}
        date['day'] = int(self.request.get('day'))
        date['month'] = int(self.request.get('month'))
        date['year'] = int(self.request.get('year'))
        schedule['date'] = date
        hour={}
        hour['start'] = int(self.request.get('start'))
        hour['end'] = int(self.request.get('end'))
        schedule['hour'] = hour
        schedule['readonly'] = False
        
        
        #check for existing same date and in cache before appending
        exist = False;
        for temp in booking_cache:
            if((temp['date'] == schedule['date']) and temp['hour'] == schedule['hour']):
                data['msg'] = 'Someone has just reserved. Please try again'
                data['exist'] = True;
                exist = True;
                break;
            else:
                data['msg'] = 'Reservation is being made'
                data['exist'] = False;
                
        if not exist:
            booking_cache.append(schedule)
                
             
        self.response.out.write(json.JSONEncoder().encode(data))
        

class cacheRemoveHandler(BaseHandler):
    def post(self):
        global booking_cache
        data={}
        data['email'] = self.request.get('email')
        data['type'] = self.request.get('type')
        
        for temp in booking_cache:
            if((temp['email'] == data['email']) and temp['type'] == data['type']):
                booking_cache.remove(temp)
                break;
        


class contactHandler(BaseHandler):
    def get(self):
        self.render_template('contact.html')
        
class galleryHandler(BaseHandler):
    def get(self):
        self.render_template('gallery.html')
        
class aboutHandler(BaseHandler):
    def get(self):
        self.render_template('about.html')
        
class servicesHandler(BaseHandler):
    def get(self):
        self.render_template('services.html')

config = {
  'webapp2_extras.auth': {
    'user_model': 'models.User',
    'user_attributes': ['first_name','accounType','email_address']
  },
  'webapp2_extras.sessions': {
    'secret_key': 'YOUR_SECRET_KEY'
  }
}

app = webapp2.WSGIApplication([
    webapp2.Route('/', MainHandler, name='home'),
    webapp2.Route('/signup', SignupHandler),
    webapp2.Route('/<type:v|p>/<user_id:\d+>-<signup_token:.+>',
      handler=VerificationHandler, name='verification'),
    webapp2.Route('/password', SetPasswordHandler),
    webapp2.Route('/login', LoginHandler, name='login'),
    webapp2.Route('/logout', LogoutHandler, name='logout'),
    webapp2.Route('/forgot', ForgotPasswordHandler, name='forgot'),
    webapp2.Route('/authenticated', AuthenticatedHandler, name='authenticated'),
    webapp2.Route('/testdb', dbHandler, name='test'),
    webapp2.Route('/sign', GuestBook),
    webapp2.Route('/verifyemail', VerifyHandler, name='verifyemail'),
    webapp2.Route('/setting', SettingHandler),
    webapp2.Route('/schedulebooking', QueryScheduleHandler),
    webapp2.Route('/scheduleconfirmation', ScheduleHandler),
    webapp2.Route('/empsignup', AdminSignupHandler),
    webapp2.Route('/json', jsonHandler),
    webapp2.Route('/cacheBooking', cacheHandler),
    webapp2.Route('/removeCacheBooking', cacheRemoveHandler),
    webapp2.Route('/contact', contactHandler),
    webapp2.Route('/gallery', galleryHandler),
    webapp2.Route('/about', aboutHandler),
    webapp2.Route('/services', servicesHandler)
], debug=True, config=config)

logging.getLogger().setLevel(logging.DEBUG)
