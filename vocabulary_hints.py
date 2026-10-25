"""Curated base vocabulary for the original course's translation drills."""
import re


REGULAR_VERBS = (
    ("accepter", "to accept"), ("accorder", "to grant"),
    ("aider", "to help"), ("aimer", "to like / love"),
    ("amuser", "to amuse"),
    ("allumer", "to turn on"), ("apporter", "to bring"),
    ("arriver", "to arrive"), ("arrêter", "to stop"),
    ("bavarder", "to chat"), ("briller", "to shine"),
    ("brosser", "to brush"),
    ("cacher", "to hide"), ("casser", "to break"),
    ("changer", "to change"), ("chercher", "to look for"),
    ("chanter", "to sing"), ("comparer", "to compare"),
    ("collectionner", "to collect"), ("commander", "to order"),
    ("compter", "to count"),
    ("couper", "to cut"), ("coucher", "to put to bed"),
    ("cuisiner", "to cook"), ("cultiver", "to grow"),
    ("danser", "to dance"), ("demander", "to ask"),
    ("dessiner", "to draw"), ("discuter", "to discuss"),
    ("douter", "to doubt"), ("durer", "to last"),
    ("distinguer", "to distinguish"), ("donner", "to give"),
    ("décider", "to decide"), ("déjeuner", "to have lunch"),
    ("dîner", "to have dinner"), ("emprunter", "to borrow"),
    ("entrer", "to enter"), ("expliquer", "to explain"),
    ("fermer", "to close"), ("frapper", "to knock"),
    ("frotter", "to rub"), ("gagner", "to earn / win"),
    ("garder", "to keep"), ("goûter", "to taste"),
    ("habiller", "to dress"), ("habiter", "to live"),
    ("inviter", "to invite"), ("jouer", "to play"),
    ("importer", "to matter"), ("occuper", "to occupy"),
    ("laisser", "to leave / let"), ("laver", "to wash"),
    ("louer", "to rent"), ("manquer", "to miss"),
    ("maquiller", "to put on makeup"), ("marcher", "to walk"),
    ("modifier", "to change"), ("monter", "to go up"),
    ("montrer", "to show"), ("oublier", "to forget"),
    ("parler", "to speak"), ("partager", "to share"),
    ("passer", "to pass / spend time"), ("patienter", "to wait"),
    ("penser", "to think"), ("porter", "to carry / wear"),
    ("poser", "to put down / ask"), ("préparer", "to prepare"),
    ("prêter", "to lend"), ("quitter", "to leave"),
    ("raconter", "to tell / recount"), ("raser", "to shave"),
    ("rater", "to miss"), ("regarder", "to watch / look at"),
    ("remercier", "to thank"), ("rencontrer", "to meet"),
    ("rentrer", "to return home"), ("reposer", "to rest"),
    ("rester", "to stay"), ("retourner", "to return / turn over"),
    ("retrouver", "to find again"), ("réparer", "to repair"),
    ("réserver", "to book"), ("réveiller", "to wake up"),
    ("sauter", "to jump"), ("sonner", "to ring"),
    ("terminer", "to finish"), ("tomber", "to fall"),
    ("travailler", "to work"), ("traverser", "to cross"),
    ("trouver", "to find"), ("téléphoner", "to phone"),
    ("utiliser", "to use"), ("visiter", "to visit"),
    ("vérifier", "to check"), ("écouter", "to listen"),
    ("économiser", "to save"), ("étudier", "to study"),
    ("excuser", "to excuse"), ("fâcher", "to anger"),
    ("réviser", "to review"), ("toucher", "to touch"),
    ("recommander", "to recommend"), ("refuser", "to refuse"),
    ("regretter", "to regret"), ("signer", "to sign"),
    ("éviter", "to avoid"),
)

# Spelling-changing verbs use their two present stems and future stem.
SPELLING_VERBS = (
    ("acheter", "to buy", "achet", "achèt", "achèter"),
    ("appeler", "to call", "appel", "appell", "appeller"),
    ("commencer", "to begin", "commenc", "commenc", "commencer"),
    ("annoncer", "to announce", "annonc", "annonc", "annoncer"),
    ("coûter", "to cost", "coût", "coût", "coûter"),
    ("déménager", "to move house", "déménag", "déménag", "déménager"),
    ("déplacer", "to move", "déplac", "déplac", "déplacer"),
    ("dépêcher", "to hurry", "dépêch", "dépêch", "dépêcher"),
    ("ennuyer", "to bore", "ennuy", "ennui", "ennuier"),
    ("entraîner", "to train / practise", "entraîn", "entraîn", "entraîner"),
    ("envoyer", "to send", "envoy", "envoi", "enverr"),
    ("essayer", "to try", "essay", "essai", "essaier"),
    ("espérer", "to hope", "espér", "espèr", "espérer"),
    ("lever", "to raise", "lev", "lèv", "lèver"),
    ("jeter", "to throw away", "jet", "jett", "jetter"),
    ("mener", "to lead", "men", "mèn", "mèner"),
    ("manger", "to eat", "mang", "mang", "manger"),
    ("emmener", "to take along", "emmen", "emmèn", "emmèner"),
    ("nager", "to swim", "nag", "nag", "nager"),
    ("neiger", "to snow", "neig", "neig", "neiger"),
    ("nettoyer", "to clean", "nettoy", "nettoi", "nettoier"),
    ("payer", "to pay", "pay", "pai", "paier"),
    ("promener", "to take for a walk", "promen", "promèn", "promèner"),
    ("préférer", "to prefer", "préfér", "préfèr", "préférer"),
    ("progresser", "to improve", "progress", "progress", "progresser"),
    ("placer", "to place", "plac", "plac", "placer"),
    ("ranger", "to tidy", "rang", "rang", "ranger"),
    ("remplacer", "to replace", "remplac", "remplac", "remplacer"),
    ("répéter", "to repeat", "répét", "répèt", "répéter"),
    ("sécher", "to dry", "séch", "sèch", "sécher"),
    ("inquiéter", "to worry", "inquiét", "inquièt", "inquiéter"),
    ("épeler", "to spell", "épel", "épell", "épeller"),
    ("voyager", "to travel", "voyag", "voyag", "voyager"),
)

# Infinitive, meaning, present forms, imperfect stem, future stem, participle,
# and any extra subjunctive, imperative or literary forms used in the course.
IRREGULAR_VERBS = (
    ("être", "to be", "suis es est sommes êtes sont", "ét", "ser", "été",
     "sois soit soyons soyez soient fus fut fûmes fûtes furent étant"),
    ("avoir", "to have", "ai as a avons avez ont", "av", "aur", "eu",
     "aie aies ait ayons ayez aient eus eut eûmes eûtes eurent ayant"),
    ("aller", "to go", "vais vas va allons allez vont", "all", "ir", "allé",
     "aille ailles aillent allai allas alla allâmes allâtes allèrent"),
    ("faire", "to do / make", "fais fait faisons faites font", "fais", "fer", "fait",
     "fasse fasses fassions fassiez fassent fis fit fîmes fîtes firent"),
    ("prendre", "to take", "prends prend prenons prenez prennent", "pren", "prendr", "pris",
     "prenne prennes prenions preniez prennent prit prîmes prîtes prirent"),
    ("apprendre", "to learn", "apprends apprend apprenons apprenez apprennent", "appren", "apprendr", "appris", "apprenne apprennes apprennent"),
    ("comprendre", "to understand", "comprends comprend comprenons comprenez comprennent", "compren", "comprendr", "compris", "comprenne comprennes comprennent"),
    ("venir", "to come", "viens vient venons venez viennent", "ven", "viendr", "venu",
     "vienne viennes viennent vins vint vînmes vîntes vinrent"),
    ("revenir", "to come back", "reviens revient revenons revenez reviennent", "reven", "reviendr", "revenu", "revienne reviennes reviennent"),
    ("devenir", "to become", "deviens devient devenons devenez deviennent", "deven", "deviendr", "devenu", "devienne deviennes deviennent"),
    ("tenir", "to hold", "tiens tient tenons tenez tiennent", "ten", "tiendr", "tenu", "tienne tiennes tiennent tins tint tînmes tîntes tinrent"),
    ("partir", "to leave", "pars part partons partez partent", "part", "partir", "parti", "parte partes"),
    ("sortir", "to go out", "sors sort sortons sortez sortent", "sort", "sortir", "sorti", ""),
    ("dormir", "to sleep", "dors dort dormons dormez dorment", "dorm", "dormir", "dormi", ""),
    ("sentir", "to feel / smell", "sens sent sentons sentez sentent", "sent", "sentir", "senti", ""),
    ("lire", "to read", "lis lit lisons lisez lisent", "lis", "lir", "lu", "lise lises lus lut lûmes lûtes lurent"),
    ("dire", "to say / tell", "dis dit disons dites disent", "dis", "dir", "dit", "dise dises"),
    ("écrire", "to write", "écris écrit écrivons écrivez écrivent", "écriv", "écrir", "écrit", "écrivis écrivit écrivirent"),
    ("décrire", "to describe", "décris décrit décrivons décrivez décrivent", "décriv", "décrir", "décrit", ""),
    ("boire", "to drink", "bois boit buvons buvez boivent", "buv", "boir", "bu", "boive boives boivent bus but burent"),
    ("voir", "to see", "vois voit voyons voyez voient", "voy", "verr", "vu", "voie voies voient vis vit virent"),
    ("savoir", "to know / find out", "sais sait savons savez savent", "sav", "saur", "su", "sache saches sachons sachez sachions sachiez sachent sachant sus sut surent"),
    ("pouvoir", "to be able to", "peux peut pouvons pouvez peuvent puis", "pouv", "pourr", "pu", "puisse puisses puissions puissiez puissent pus put purent"),
    ("vouloir", "to want", "veux veut voulons voulez veulent", "voul", "voudr", "voulu", "veuille veuilles veuillons veuillez veuillent voulus voulut voulurent"),
    ("devoir", "to have to / owe", "dois doit devons devez doivent", "dev", "devr", "dû", "doive doives doivent dus dut durent"),
    ("recevoir", "to receive", "reçois reçoit recevons recevez reçoivent", "recev", "recevr", "reçu", "reçoive reçoives reçoivent reçus reçut reçurent"),
    ("connaître", "to know / be familiar with", "connais connaît connaissons connaissez connaissent", "connaiss", "connaîtr", "connu", "connaisse connaisses connus connut connurent"),
    ("reconnaître", "to recognise", "reconnais reconnaît reconnaissons reconnaissez reconnaissent", "reconnaiss", "reconnaîtr", "reconnu", ""),
    ("mettre", "to put", "mets met mettons mettez mettent", "mett", "mettr", "mis", "mette mettes mit mirent"),
    ("remettre", "to put back", "remets remet remettons remettez remettent", "remett", "remettr", "remis", ""),
    ("ouvrir", "to open", "ouvre ouvres ouvrons ouvrez ouvrent", "ouvr", "ouvrir", "ouvert", ""),
    ("offrir", "to offer / give", "offre offres offrons offrez offrent", "offr", "offrir", "offert", ""),
    ("souffrir", "to suffer", "souffre souffres souffrons souffrez souffrent", "souffr", "souffrir", "souffert", ""),
    ("courir", "to run", "cours court courons courez courent", "cour", "courr", "couru", ""),
    ("mourir", "to die", "meurs meurt mourons mourez meurent", "mour", "mourr", "mort", "meure meures meurent mourut moururent"),
    ("naître", "to be born", "nais naît naissons naissez naissent", "naiss", "naîtr", "né", "naquit naquirent"),
    ("suivre", "to follow", "suis suit suivons suivez suivent", "suiv", "suivr", "suivi", ""),
    ("conduire", "to drive", "conduis conduit conduisons conduisez conduisent", "conduis", "conduir", "conduit", "conduise conduises"),
    ("rire", "to laugh", "ris rit rions riez rient", "ri", "rir", "ri", ""),
    ("sourire", "to smile", "souris sourit sourions souriez sourient", "souri", "sourir", "souri", ""),
    ("croire", "to believe", "crois croit croyons croyez croient", "croy", "croir", "cru", "croie croies croient"),
    ("pleuvoir", "to rain", "pleut", "pleuv", "pleuvr", "plu", "pleuve"),
    ("falloir", "to be necessary", "faut", "fall", "faudr", "fallu", "faille"),
    ("valoir", "to be worth", "vaux vaut valons valez valent", "val", "vaudr", "valu", "vaille"),
    ("asseoir", "to sit", "assieds assied asseyons asseyez asseyent assois assoit assoyons assoyez assoient", "assey", "assiér", "assis", ""),
    ("accueillir", "to welcome", "accueille accueilles accueillons accueillez accueillent", "accueill", "accueiller", "accueilli", ""),
    ("rejoindre", "to join", "rejoins rejoint rejoignons rejoignez rejoignent", "rejoign", "rejoindr", "rejoint", ""),
    ("repeindre", "to repaint", "repeins repeint repeignons repeignez repeignent", "repeign", "repeindr", "repeint", ""),
    ("vivre", "to live", "vis vit vivons vivez vivent", "viv", "vivr", "vécu", "vive vives"),
    ("craindre", "to fear", "crains craint craignons craignez craignent", "craign", "craindr", "craint", ""),
    ("souvenir", "to remember", "souviens souvient souvenons souvenez souviennent", "souven", "souviendr", "souvenu", "souvienne souviennes souviennent"),
    ("endormir", "to put to sleep", "endors endort endormons endormez endorment", "endorm", "endormir", "endormi", ""),
    ("découvrir", "to discover", "découvre découvres découvrons découvrez découvrent", "découvr", "découvrir", "découvert", ""),
    ("couvrir", "to cover", "couvre couvres couvrons couvrez couvrent", "couvr", "couvrir", "couvert", ""),
    ("prévenir", "to warn", "préviens prévient prévenons prévenez préviennent", "préven", "préviendr", "prévenu", ""),
    ("surprendre", "to surprise", "surprends surprend surprenons surprenez surprennent", "surpren", "surprendr", "surpris", ""),
    ("éteindre", "to turn off", "éteins éteint éteignons éteignez éteignent", "éteign", "éteindr", "éteint", ""),
    ("plaire", "to please", "plais plaît plaisons plaisez plaisent", "plais", "plair", "plu", ""),
    ("refaire", "to do again", "refais refait refaisons refaites refont", "refais", "refer", "refait", "refasse refasses refassent"),
    ("bouillir", "to boil", "bous bout bouillons bouillez bouillent", "bouill", "bouillir", "bouilli", ""),
)

NOUNS = (
    ("tante", "aunt"), ("oncle", "uncle"), ("midi", "noon"),
    ("minuit", "midnight"), ("matin", "morning"), ("soir", "evening"),
    ("hier", "yesterday"), ("demain", "tomorrow"), ("aujourd'hui", "today"),
    ("tôt", "early"), ("tard", "late"), ("maintenant", "now"),
    ("déjà", "already"), ("souvent", "often"), ("toujours", "always"),
    ("bientôt", "soon"), ("ici", "here"), ("ensemble", "together"),
    ("avant", "before"), ("après", "after"), ("pendant", "during"),
    ("maison", "house"), ("école", "school"), ("gare", "station"),
    ("train", "train"), ("voiture", "car"), ("bus", "bus"),
    ("livre", "book"), ("cahier", "notebook"), ("stylo", "pen"),
    ("lettre", "letter"), ("message", "message"), ("nouvelle", "news"),
    ("travail", "work"), ("bureau", "office"), ("table", "table"),
    ("porte", "door"), ("fenêtre", "window"), ("clé", "key"),
    ("frère", "brother"), ("sœur", "sister"), ("mère", "mother"),
    ("père", "father"), ("enfant", "child"), ("ami", "friend"),
    ("amie", "friend"), ("professeur", "teacher"), ("étudiant", "student"),
    ("voisin", "neighbor"), ("voisine", "neighbor"), ("parent", "parent"),
    ("fille", "girl"), ("garçon", "boy"), ("femme", "woman"),
    ("homme", "man"), ("famille", "family"), ("repas", "meal"),
    ("pain", "bread"), ("eau", "water"), ("lait", "milk"),
    ("café", "coffee"), ("thé", "tea"), ("jus", "juice"),
    ("dîner", "dinner"), ("déjeuner", "lunch"), ("gâteau", "cake"),
    ("restaurant", "restaurant"), ("chambre", "bedroom"), ("lit", "bed"),
    ("hôtel", "hotel"), ("rue", "street"), ("ville", "city"),
    ("pays", "country"), ("parc", "park"), ("jardin", "garden"),
    ("marché", "market"), ("magasin", "shop"), ("musée", "museum"),
    ("cinéma", "cinema"), ("film", "film"), ("musique", "music"),
    ("question", "question"), ("réponse", "answer"), ("problème", "problem"),
    ("vérité", "truth"), ("histoire", "story"), ("leçon", "lesson"),
    ("exercice", "exercise"), ("devoir", "homework"), ("examen", "exam"),
    ("billet", "ticket"), ("sac", "bag"), ("valise", "suitcase"),
    ("chaise", "chair"), ("appartement", "apartment"), ("cuisine", "kitchen"),
    ("dossier", "file"), ("formulaire", "form"), ("rendez-vous", "appointment"),
    ("heure", "hour"), ("jour", "day"), ("semaine", "week"),
    ("mois", "month"), ("année", "year"), ("minute", "minute"),
    ("fois", "time"), ("temps", "time"), ("vacances", "holidays"),
    ("sport", "sport"), ("football", "football"), ("tennis", "tennis"),
    ("photo", "photo"), ("adresse", "address"), ("numéro", "number"),
    ("argent", "money"), ("prix", "price"), ("euro", "euro"),
    ("fleur", "flower"), ("arbre", "tree"), ("chien", "dog"),
    ("chat", "cat"), ("cadeau", "gift"), ("anniversaire", "birthday"),
    ("pluie", "rain"), ("neige", "snow"), ("soleil", "sun"),
    ("mer", "sea"), ("rivière", "river"), ("montagne", "mountain"),
    ("peur", "fear"), ("besoin", "need"), ("envie", "desire"),
    ("idée", "idea"), ("choix", "choice"), ("raison", "reason"),
    ("attention", "attention"), ("accord", "agreement"),
    ("bonjour", "hello"), ("bonsoir", "good evening"), ("salut", "hi"),
    ("merci", "thank you"), ("pardon", "sorry"), ("monsieur", "sir"),
    ("madame", "madam"), ("beaucoup", "a lot"), ("croissant", "croissant"),
    ("journée", "day"), ("qui", "who"), ("rien", "nothing"),
    ("tableau", "board"), ("classe", "classroom"),
    ("centre-ville", "downtown"), ("concert", "concert"),
    ("samedi", "Saturday"), ("village", "village"),
    ("campagne", "countryside"), ("froid", "cold"), ("janvier", "January"),
    ("prénom", "first name"), ("nom", "name"), ("voyageur", "traveller"),
    ("secret", "secret"), ("fin", "end"), ("bruit", "noise"),
    ("personnage", "character"), ("version", "version"),
    ("assiette", "plate"), ("boîte", "box"), ("papier", "paper"),
    ("bois", "wood"), ("été", "summer"), ("vue", "view"),
    ("invité", "guest"), ("arrivée", "arrival"),
    ("compte", "account"),
    ("boulangerie", "bakery"), ("bibliothèque", "library"),
    ("banque", "bank"), ("aéroport", "airport"), ("avion", "plane"),
    ("vélo", "bike"), ("bateau", "boat"), ("route", "road"),
    ("piscine", "swimming pool"), ("pharmacie", "pharmacy"),
    ("supermarché", "supermarket"), ("plage", "beach"),
    ("forêt", "forest"), ("château", "castle"),
    ("salle", "room"), ("salon", "living room"), ("juillet", "July"),
    ("manteau", "coat"), ("robe", "dress"), ("chemise", "shirt"),
    ("veste", "jacket"), ("chapeau", "hat"), ("chaussure", "shoe"),
    ("lunettes", "glasses"), ("parapluie", "umbrella"),
    ("bouteille", "bottle"), ("verre", "glass"), ("tasse", "cup"),
    ("fourchette", "fork"), ("cuillère", "spoon"),
    ("fromage", "cheese"), ("fruit", "fruit"), ("pomme", "apple"),
    ("poire", "pear"), ("salade", "salad"), ("viande", "meat"),
    ("poisson", "fish"), ("légume", "vegetable"), ("sucre", "sugar"),
    ("beurre", "butter"), ("soupe", "soup"), ("sel", "salt"),
    ("collègue", "colleague"), ("colocataire", "roommate"),
    ("cousin", "cousin"), ("cousine", "female cousin"),
    ("bébé", "baby"), ("médecin", "doctor"), ("docteur", "doctor"),
    ("grand-mère", "grandmother"), ("grand-père", "grandfather"),
    ("visage", "face"), ("main", "hand"), ("cheveux", "hair"),
    ("miroir", "mirror"), ("savon", "soap"), ("serviette", "towel"),
    ("lumière", "light"), ("lampe", "lamp"), ("étagère", "shelf"),
    ("tiroir", "drawer"), ("couloir", "corridor"), ("escalier", "stairs"),
    ("quartier", "neighborhood"), ("début", "beginning"),
    ("promenade", "walk"), ("voyage", "trip"),
    ("réunion", "meeting"), ("invitation", "invitation"),
    ("mariage", "wedding"), ("fête", "party"), ("jeu", "game"),
    ("portable", "mobile phone"), ("téléphone", "phone"),
    ("ordinateur", "computer"), ("journal", "newspaper"),
    ("texte", "text"), ("phrase", "sentence"), ("mot", "word"),
    ("page", "page"), ("règle", "rule"), ("document", "document"),
    ("contrat", "contract"), ("projet", "project"), ("plan", "plan"),
    ("au revoir", "goodbye"), ("de rien", "you are welcome"),
    ("enchanté", "nice to meet you"),
)

REFLEXIVE = {
    "amuser": ("s'amuser", "to have fun"),
    "appeler": ("s'appeler", "to be called"),
    "arrêter": ("s'arrêter", "to stop"),
    "asseoir": ("s'asseoir", "to sit down"),
    "coucher": ("se coucher", "to go to bed"),
    "dépêcher": ("se dépêcher", "to hurry"),
    "endormir": ("s'endormir", "to fall asleep"),
    "ennuyer": ("s'ennuyer", "to get bored"),
    "fâcher": ("se fâcher", "to get angry"),
    "habiller": ("s'habiller", "to get dressed"),
    "laver": ("se laver", "to wash oneself"),
    "inquiéter": ("s'inquiéter", "to worry"),
    "lever": ("se lever", "to get up"),
    "maquiller": ("se maquiller", "to put on makeup"),
    "promener": ("se promener", "to take a walk"),
    "préparer": ("se préparer", "to get ready"),
    "occuper": ("s'occuper", "to take care of"),
    "raser": ("se raser", "to shave"),
    "reposer": ("se reposer", "to rest"),
    "réveiller": ("se réveiller", "to wake up"),
    "souvenir": ("se souvenir", "to remember"),
}


def _verb_forms():
    forms = {}

    def add(lemma, meaning, words):
        for word in words:
            forms.setdefault(word, []).append((lemma, meaning))

    def tenses(lemma, meaning, present, imperfect, future, participle, extra):
        words = {lemma, *present.split(), *extra.split()}
        words.update(imperfect + end for end in (
            "ais", "ait", "ions", "iez", "aient", "ant"
        ))
        words.update(future + end for end in (
            "ai", "as", "a", "ons", "ez", "ont",
            "ais", "ait", "ions", "iez", "aient"
        ))
        words.update(participle + end for end in ("", "e", "s", "es"))
        add(lemma, meaning, words)

    for lemma, meaning in REGULAR_VERBS:
        stem = lemma[:-2]
        tenses(lemma, meaning, " ".join(stem + end for end in (
            "e", "es", "ons", "ez", "ent", "ions", "iez"
        )), stem, lemma, stem + "é", " ".join(stem + end for end in (
            "ai", "as", "a", "âmes", "âtes", "èrent"
        )))
    for lemma, meaning, stem, changed, future in SPELLING_VERBS:
        present = " ".join([changed + end for end in ("e", "es", "ent")] +
                           [stem + end for end in ("ons", "ez", "ions", "iez")])
        tenses(lemma, meaning, present, stem, future, stem + "é", "")
        if stem.endswith("g"):
            add(lemma, meaning, [stem + "e" + end for end in ("ons", "ais", "ait", "aient", "ant")])
        elif stem.endswith("c"):
            add(lemma, meaning, [stem[:-1] + "ç" + end for end in ("ons", "ais", "ait", "aient", "ant")])
    for lemma, meaning in (
        ("finir", "to finish"), ("choisir", "to choose"),
        ("réussir", "to succeed"), ("remplir", "to fill"),
        ("réfléchir", "to think / reflect"), ("rougir", "to blush"),
        ("grandir", "to grow"), ("obéir", "to obey"),
    ):
        stem = lemma[:-2]
        present = " ".join(stem + end for end in (
            "is", "it", "issons", "issez", "issent", "isse", "isses", "issions", "issiez"
        ))
        tenses(lemma, meaning, present, stem + "iss", lemma, stem + "i", "")
    for lemma, meaning in (
        ("attendre", "to wait"), ("entendre", "to hear"),
        ("vendre", "to sell"), ("répondre", "to answer"),
        ("perdre", "to lose"), ("rendre", "to give back"),
        ("descendre", "to go down"), ("détendre", "to relax"),
        ("confondre", "to confuse"),
    ):
        stem = lemma[:-2]
        present = " ".join(stem + end for end in ("s", "", "ons", "ez", "ent", "e", "es"))
        tenses(lemma, meaning, present, stem, lemma[:-1], stem + "u", "")
    for entry in IRREGULAR_VERBS:
        tenses(*entry)
    return forms


VERB_FORMS = _verb_forms()
NOUN_FORMS = {
    form: (lemma, meaning)
    for lemma, meaning in NOUNS
    for form in (lemma, lemma if lemma.endswith(("s", "x")) else lemma + "s")
}
NOUN_FORMS.update({
    "enfants": ("enfant", "child"),
    "yeux": ("œil", "eye"),
    "journaux": ("journal", "newspaper"),
    "enchantée": ("enchanté", "nice to meet you"),
    "à bientôt": ("bientôt", "soon"),
})

NOUN_SENSES = {
    "café": {"café", "cafés"},
    "déjeuner": {"breakfast", "lunchtime"},
    "bureau": {"desk"},
    "voisin": {"neighbour", "neighbours"},
    "heure": {"o’clock"},
    "enfant": {"children"},
    "à bientôt": {"see you soon"},
}


def base_word_hints(gloss):
    pairs = re.findall(r"`([^`]+)` \(([^()]+)\)", gloss)
    verbs, nouns = [], []
    reflexive = False
    for fr, en in pairs:
        word = fr.lower().replace("’", "'")
        if word in ("me", "m'", "te", "t'", "se", "s'", "nous", "vous"):
            if "self" in en or "selves" in en or en == "each other":
                reflexive = True
            continue
        if "helper" in en:
            continue
        if word == "plus" or (word == "puis" and en == "then"):
            continue
        if word in ("s'il vous plaît", "s'il te plaît"):
            verbs.append(("plaire", "to please"))
            continue
        noun = NOUN_FORMS.get(word)
        noun_meaning = noun[1].lower() if noun else ""
        # Homographs such as lit, porte, marché and dîner need their gloss.
        if noun and (en.lower() in (
            noun_meaning, noun_meaning + "s", noun_meaning + "es"
        ) or en.lower() in NOUN_SENSES.get(noun[0], set())
                or en.lower() in NOUN_SENSES.get(word, set())):
            if word == "déjeuner" and en == "breakfast":
                noun = ("déjeuner", "breakfast")
            nouns.append(noun)
            continue
        word = re.sub(r"-(?:je|tu|il|elle|on|nous|vous|ils|elles)$", "", word)
        word = re.sub(r"-(?:le|la|les|moi|toi|lui|nous|vous|leur|y|en|m'|t').*$", "", word)
        candidates = VERB_FORMS.get(word, [])
        if word == "suis":
            candidates = [pair for pair in candidates if pair[0] == (
                "suivre" if en == "follow" else "être"
            )]
        elif word in ("vis", "vit"):
            candidates = [pair for pair in candidates if pair[0] == (
                "vivre" if en in ("live", "lives") else "voir"
            )]
        elif word == "plu":
            candidates = [pair for pair in candidates if pair[0] == (
                "pleuvoir" if en == "rained" else "plaire"
            )]
        if candidates:
            lemma, meaning = candidates[0]
            if (reflexive or lemma == "souvenir") and lemma in REFLEXIVE:
                lemma, meaning = REFLEXIVE[lemma]
            verbs.append((lemma, meaning))
            reflexive = False
    chosen = list(dict.fromkeys(verbs))[:2]
    chosen += list(dict.fromkeys(nouns))[:max(0, 4 - len(chosen))]
    return sorted(chosen, key=lambda pair: pair[1])
