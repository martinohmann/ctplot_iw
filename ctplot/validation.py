#!/usr/bin/env python

import copy
import re

from ctplot.i18n import _
from safeeval import safeeval

class ValidationError(Exception):
    pass


class ValidatorTypeError(Exception):
    pass


class Validator(object):

    """
    title is a meaningful description of the formfield
    """
    def validate(self, name, title, value):
        pass


class Castable(Validator):

    def __init__(self, cast_func = None):
        self.cast_func = cast_func
        self.msg_fmt = ''

    def validate(self, name, title, value):
        try:
            value = self.cast_func(value)
        except ValueError:
            raise ValidationError(self.msg_fmt % title)
        return value


class Int(Castable):

    """
    Validates if value can be cast to integer
    """
    def __init__(self):
        super(Int, self).__init__(int)
        self.msg_fmt = _('%s has to be an integer')


class IntRange(Int):

    """
    First validates if value is an int, before validating range
    """
    def __init__(self, rmin, rmax):
        super(IntRange, self).__init__()
        self.rmin = rmin
        self.rmax = rmax

    def validate(self, name, title, value):
        value = super(IntRange, self).validate(name, title, value)
        try:
            if not (self.rmin <= value <= self.rmax):
                raise ValueError
        except ValueError:
            raise ValidationError(_('%s has to be within range [%d..%d]') %
                (title, self.rmin, self.rmax))
        return value


class Float(Castable):

    """
    Validates if value ca be cast to float
    """
    def __init__(self):
        super(Float, self).__init__(float)
        self.msg_fmt = _('%s has to be a float value')


class FloatRange(Float):

    """
    First validates if value is a float, before validating range
    """
    def __init__(self, rmin, rmax):
        super(FloatRange, self).__init__()
        self.rmin = rmin
        self.rmax = rmax

    def validate(self, name, title, value):
        value = super(FloatRange, self).validate(name, title, value)
        try:
            if not (self.rmin <= value <= self.rmax):
                raise ValueError
        except ValueError:
            raise ValidationError(_('%s has to be within range [%f..%f]') %
                (title, self.rmin, self.rmax))
        return value


class Regexp(Validator):

    """
    Validates if value matches regexp
    """
    def __init__(self, regexp, regexp_desc = None):
        self.regexp = regexp
        self.re = re.compile(regexp)
        self.regexp_desc = regexp_desc

        if self.regexp_desc == None:
            self.regexp_desc = regexp

    def validate(self, name, title, value):
        if not self.re.match(value):
            raise ValidationError(_("%s has to match %s") %
                    (title, self.regexp_desc))
        return value


class NotEmpty(Validator):

    """
    Validates if value is not an empty string
    """
    def validate(self, name, title, value):
        if value == "":
            raise ValidationError(_("%s must not be empty") %
                    title)
        return value



class OneOf(Validator):

    """
    Validates if value matches regexp
    """
    def __init__(self, item_list):
        if not isinstance(item_list, (list, tuple)):
            raise ValueError("List or tuple expected")

        self.item_list = item_list

    def validate(self, name, title, value):
        if not value in self.item_list:
            raise ValidationError(_("%s has to be one of %s") %
                    (title, ', '.join(self.item_list)))
        return value


class Expression(Validator):

    """
    Tries to evaluate the given expression,
    the expression is surrounded by the optional prefix and suffix
    """
    def __init__(self, prefix = '', suffix = '', args = {}, transform = False):
        self.prefix = prefix
        self.suffix = suffix
        self.transform = transform
        self.safeeval = safeeval()

        # add args to safeeval's local variables
        for k, v in args.items():
            self.safeeval[k] = v


    def validate(self, name, title, value):
        if value == "":
            return value
        try:
            result = self.safeeval(self.prefix + value + self.suffix)

            # only transform field value if intended
            if self.transform:
                return result
        except Exception:
            raise ValidationError(_("%s is no valid expression") %
                    title)
        return value


class FormDataValidator(object):

    """
    The FormValidator applies validators to certain fields of the form_data.
    """
    def __init__(self, form_data, strict=False):
        self.fields = {}
        self.errors = []
        self.strict = strict
        self.form_data = copy.deepcopy(form_data)

    """
    Add a validator for a form field defined by name. title will be
    used in error messages
    """
    def add(self, name, validator, **kwargs):
        if isinstance(validator, (list, tuple)):
            for v in validator:
                self.add(name, v, **kwargs)
            return

        if not isinstance(validator, Validator):
            raise ValidatorTypeError(_("Invalid validator for field %s: %s") %
                    (name, str(validator)))

        if not name in self.fields:
            title = kwargs['field_title'] if 'field_title' in kwargs else name
            self.fields[name] = { 'title': title, 'validators': [] }

        self.fields[name]['validators'].append(validator)

    def validate(self):
        for name in self.fields:
            title = self.fields[name]['title']

#             if not name in self.form_data:
#                 if self.strict:
#                     self.errors.append(_("%s not found in form data") % title)
#                 continue

            for v in self.fields[name]['validators']:
                try:
                    value = ''
                    key_exists = True if name in self.form_data else False

                    if key_exists:
                        value = self.form_data[name]

                    # the validator is allowed to transform the form_data, e.g.
                    # perform type conversions if needed, or normalize values
                    value = v.validate(name, title, value)

                    if key_exists:
                        self.form_data[name] = value
                except ValidationError as e:
                    # it is sufficient to add the first error of each field to
                    # the error list
                    self.errors.append(str(e))
                    break

        return self.is_valid()

    def is_valid(self):
        return len(self.errors) == 0

    def get_errors(self):
        return self.errors

    def get_form_data(self):
        return self.form_data


if __name__ == '__main__':

    form_data = {
        'field1': 1,
        'field2': "10",
        'field3': "3.5",
        'field4': "adfwe3.5",
        'field10': "-0.5, 1.5",
        'field11': "",
        'field12': "",
        'field13': "sdf",
        'field14': "lat",
        'field15': "p[0] + p[1] * x",
        'field16': "10 < x < 20",
    }

    v = FormDataValidator(form_data)
    v.add('field1', Int(), field_title='Feld1')
    v.add('field1', Float())
    v.add('field2', IntRange(0, 5), field_title='Feld2')
    v.add('field3', FloatRange(0, 10), field_title='Feld3')
    v.add('field4', Float())
    v.add('field5', Float())
    v.add('field10', Regexp('^\s*[-+]?[0-9]*\.?[0-9]+\s*,\s*[-+]?[0-9]*\.?[0-9]+\s*$'))
    v.add('field11', NotEmpty())
    v.add('field12', [NotEmpty(), Float()])
    v.add('field13', [NotEmpty(), Regexp('^(lat|lon)$', regexp_desc='something like e.g. lat, lon, latitude or longitude')])
    v.add('field14', OneOf(['lat1', 'lon']))
    v.add('field15', Expression(transform=True, prefix='lambda x,*p:'))
    var = 'x'
    val = 15
    v.add('field16', Expression(args={var: val}))

    v.validate()

    if v.is_valid():
        print 'form data valid'
    else:
        print 'errors:'
        print v.get_errors()

    print 'original:'
    print form_data
    print 'copy:'
    print v.get_form_data()
