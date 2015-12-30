import gettext

t = gettext.translation('ctplot', 'locale', languages=['de'], fallback=True)
_ = t.gettext
