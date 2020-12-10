const source = `Cette lettre t’est adressée par Paul, serviteur de Dieu et apôtre de Jésus-Christ. Ceux que Dieu a choisis, j’ai été chargé de les conduire dans la foi et la pleine connaissance de la vérité qui est conforme à la piété,`;
const target = `This letter is addressed to you by Paul, a servant of God and an apostle of Jesus Christ. Those whom God has chosen, I was responsible for driving them in the faith and the full knowledge of the truth that is consistent with godliness,`;

const targetWords = `EN
10
11
12
13
14
15
16
2
3
4
5
6
7
8
9
a
able
about
above
accordance
according
accused
actions
addicted
after
age
ages
agrees
All
all
also
always
an
and
angered
another
any
anyone
Apollos
apostle
appeared
appearing
are
argue
arrogant
Artemas
as
ashamed
astray
at
attention
authorities
authority
avoid
away
bad
be
beasts
because
become
been
before
behavior
being
believed
bellies
birth
blameless
blessed
both
brawler
bring
But
but
by
careful
certain
children
chosen
Christ
circumcision
city
come
command
commands
common
complete
conflict
consciences
corrupt
corrupted
credit
Cretans
Crete
criticism
debates
deceivers
decided
demonstrate
deny
detestable
did
dignified
dignity
Diligently
directed
disobedient
disregard
divisive
does
easily
elders
empty
encourage
engage
enslaved
entrusted
envy
especially
essential
everlasting
every
everyone
everything
evil
example
exhort
faith
faithful
Father
fits
foolish
For
for
forward
friend
from
gave
genealogies
gentle
glory
God
godlessness
godliness
godly
good
Grace
grace
great
greedy
Greet
greet
has
hating
have
having
He
he
heirs
him
himself
his
hold
Holy
holy
hope
hospitable
household
households
housekeepers
humility
hurry
husband
husbands
I
if
In
in
insist
Instead
instead
insulted
is
It
it
Jesus
Jewish
justified
kindness
know
knowing
knowledge
lack
law
lawlessness
lawyer
lazy
learn
led
left
Let
liars
lie
life
likewise
live
lived
look
love
lovers
man
manager
mankind
many
masters
may
me
men
mercy
message
might
minds
much
must
myths
necessary
needs
new
Nicopolis
no
not
nothing
obey
of
Older
on
once
One
one
opponent
oppose
or
ordain
order
others
our
overseer
own
passions
Paul
paying
peace
people
perseverance
person
pleasing
pleasures
poured
present
proclamation
profess
profit
promised
prophets
pure
purify
purpose
ready
reason
rebellion
rebellious
rebuke
receiving
reckless
redeem
Reject
rejecting
Remind
renewal
revealed
reverent
revile
richly
right
righteous
righteousness
rulers
said
sake
salvation
same
saved
Savior
say
self-condemned
self-controlled
send
sensible
servant
set
severely
shameful
should
showing
Similarly
sinning
slanderers
Slaves
slaves
so
son
sound
Speak
speak
special
spend
Spirit
steal
stop
strife
subject
submit
such
talkers
teachers
teaching
temperate
testimony
that
the
their
them
themselves
there
These
these
They
they
things
This
this
those
through
tightly
time
Titus
To
to
toward
train
training
TRUE
true
trustworthy
truth
turn
turned
two
Tychicus
unbelieving
uncontentious
uncorrupted
unfit
unfruitful
unprofitable
upsetting
us
useful
various
want
warnings
was
washing
way
ways
We
we
were
what
When
when
while
who
whole
whom
wife
wine
winter
with
women
word
work
works
worldly
worthless
yet
you
younger
your
yourself
Zenas
zealous`;

const sourceWords = `FR
dix
11
12
13
14
15
16
2
3
4
5
6
sept
8
9
une
capable
à propos
au dessus
conformité
selon
accusé
Actions
intoxiqué
après
âge
âge
accepte
Tout
tout
aussi
toujours
un
et
mis en colère
un autre
tout
n'importe qui
Apollos
apôtre
apparu
apparaissant
sont
se disputer
arrogant
Artémas
comme
honteux
égaré
à
attention
les autorités
autorité
éviter
un moyen
mal
être
bêtes
car
devenir
été
avant
comportement
étant
a cru
ventres
naissance
irréprochable
béni
tous les deux
bagarreur
apporter
Mais
mais
par
prudent
certain
enfants
choisi
Christ
circoncision
ville
viens
commander
commandes
commun
Achevée
conflit
consciences
corrompu
corrompu
crédit
Crétois
Crète
critique
débats
séducteurs
décidé
démontrer
Nier
détestable
fait
digne
dignité
diligemment
Directed
désobéissant
mépris
division
Est-ce que
facilement
aînés
vide
encourager
engager
esclave
confié
envie
notamment
essentiel
éternel
chaque
toutes les personnes
tout
mal
exemple
exhorter
Foi
fidèle
Père
fits
insensé
Pour
pour
vers l'avant
ami
de
a donné
généalogies
doux
gloire
Dieu
godlessness
sainteté
pieux
bien
la grâce
la grâce
génial
glouton
Saluer
saluer
a
Hating
avoir
ayant
Il
il
héritiers
lui
lui-même
le sien
tenir
Saint
saint
espérer
hospitalier
Ménage
ménages
femmes de ménage
humilité
se dépêcher
mari
maris
je
si
Dans
dans
insister
Au lieu
au lieu
insulté
est
Il
il
Jésus
juif
justifiée
la gentillesse
connaître
connaissance
connaissance
manquer de
loi
iniquité
avocat
paresseux
apprendre
LED
la gauche
Laisser
menteurs
mensonge
la vie
également
vivre
vivait
Regardez
amour
les amoureux
homme
directeur
humanité
beaucoup
maîtrise
peut
moi
Hommes
pitié
message
pourrait
esprit
beaucoup
doit
mythes
nécessaire
Besoins
Nouveau
Nicopolis
non
ne pas
rien
obéit
de
Plus âgée
sur
une fois que
Un
un
adversaire
s'opposer
ou
ordonner
ordre
autres
notre
surveillant
posséder
passions
Paul
payant
paix
gens
persévérance
la personne
plaisant
les plaisirs
versé
présent
proclamation
professer
profit
promis
prophètes
pur
purifier
objectif
prêt
raison
rébellion
rebelle
réprimander
réception
téméraire
racheter
Rejeter
rejetant
Rappeler
renouvellement
révélé
respectueux
vilipender
richement
droite
vertueux
droiture
dirigeants
m'a dit
Saké
salut
même
enregistré
Sauveur
dire
auto-condamné
auto-contrôle
envoyer
sensible
serviteur
ensemble
gravement
honteux
devrait
montrant
De même
pêcher
calomniateurs
Des esclaves
des esclaves
donc
fils
du son
Parler
parler
spécial
dépenser
Esprit
voler
Arrêtez
conflit
matière
soumettre
tel
affichettes
enseignants
enseignement
tempéré
témoignage
cette
le
leur
leur
se
Là
Celles-ci
celles-ci
Ils
ils
des choses
Ce
ce
ceux
par
fermement
temps
Titus
À
à
vers
train
entraînement
VRAI
vrai
digne de confiance
vérité
tour
tourné
deux
Tychique
incrédule
incontestées
uncorrupted
inapte
infructueux
peu rentable
bouleversant
nous
utile
divers
vouloir
mises en garde
était
la lessive
façon
façons
nous
nous
étaient
quoi
Quand
quand
tandis que
OMS
entier
qui
épouse
du vin
hiver
avec
femmes
mot
travail
travaux
mondain
vain
encore
toi
plus jeune
votre
toi même
zenas
zélé`;

export const getData = () => {
  return {
    source,
    target,
    sourceWords,
    targetWords,
  };
};