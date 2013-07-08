import time
import webapp2_extras.appengine.auth.models

from google.appengine.ext import ndb

from webapp2_extras import security

from google.appengine.ext import db


class Greeting(db.Model):
    content = db.StringProperty()
    date = db.DateTimeProperty(auto_now_add=True)
    
class Customer(db.Model):
    Email = db.EmailProperty()
    First_Name = db.StringProperty()
    Last_Name = db.StringProperty()
    Contact_No = db.IntegerProperty()
    Address = db.StringProperty()
    postalCode = db.IntegerProperty()
    
class Staff(db.Model):
    Email = db.EmailProperty()
    First_Name = db.StringProperty()
    Last_Name = db.StringProperty()
    Contact_No = db.IntegerProperty()
    Address = db.StringProperty()
    postalCode = db.IntegerProperty()

class Job(db.Model):
    Email = db.EmailProperty()
    StartDate = db.DateTimeProperty()
    EndDate = db.DateTimeProperty()
    Service_Type = db.StringProperty()
    Description = db.StringProperty()
    postalCode = db.IntegerProperty()
    
class Quotation(db.Model):
    ServiceType = db.StringProperty()
    Name = db.StringProperty()
    Email = db.EmailProperty()
    Contact_No = db.IntegerProperty()
    Request = db.TextProperty()
    
def item_key(itemStorage):
    """Constructs a Datastore key for an item entity with itemStorage."""
    return ndb.Key('Item', itemStorage)

class Item(ndb.Model):
    Type = ndb.StringProperty()
    Name = ndb.StringProperty()
    Description = ndb.StringProperty()
    Price = ndb.StringProperty()
    Quantity = ndb.StringProperty()
    Store = ndb.StringProperty()

def warehouse_key(whouse):
    """Constructs a Datastore key for an item entity with itemStorage."""
    return ndb.Key('Warehouse', whouse)

class Warehouse(ndb.Model):
    Name = ndb.StringProperty()
    Location = ndb.StringProperty()


class User(webapp2_extras.appengine.auth.models.User):
  def set_password(self, raw_password):
    """Sets the password for the current user

    :param raw_password:
        The raw password which will be hashed and stored
    """
    self.password = security.generate_password_hash(raw_password, length=12)

  @classmethod
  def get_by_auth_token(cls, user_id, token, subject='auth'):
    """Returns a user object based on a user ID and token.

    :param user_id:
        The user_id of the requesting user.
    :param token:
        The token string to be verified.
    :returns:
        A tuple ``(User, timestamp)``, with a user object and
        the token timestamp, or ``(None, None)`` if both were not found.
    """
    token_key = cls.token_model.get_key(user_id, subject, token)
    user_key = ndb.Key(cls, user_id)
    # Use get_multi() to save a RPC call.
    valid_token, user = ndb.get_multi([token_key, user_key])
    if valid_token and user:
        timestamp = int(time.mktime(valid_token.created.timetuple()))
        return user, timestamp

    return None, None