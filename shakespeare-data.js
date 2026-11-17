// Shakespeare canon and study-guide content.
// PLAY_DEFS: [name, first performance, type, extra accepted answers separated by |]
// The 39-play canon: the 36 in the First Folio plus Pericles, The Two Noble Kinsmen
// and Edward III. [name, first performance, type, extra accepted answers separated by |]
const PLAY_DEFS = [
  // Comedies
  ['The Two Gentlemen of Verona', '1590–91', 'Comedy', 'two gentlemen|two gents'],
  ['The Taming of the Shrew', '1590–91', 'Comedy', 'shrew'],
  ['The Comedy of Errors', '1592–93', 'Comedy', 'comedy of errors'],
  ["Love's Labour's Lost", '1594–95', 'Comedy', 'loves labors lost|lll'],
  ["A Midsummer Night's Dream", '1595–96', 'Comedy', 'midsummer|midsummer nights dream|msnd'],
  ['The Merchant of Venice', '1596–97', 'Comedy', 'merchant of venice'],
  ['The Merry Wives of Windsor', '1597–98', 'Comedy', 'merry wives'],
  ['Much Ado About Nothing', '1598–99', 'Comedy', 'much ado'],
  ['As You Like It', '1599–1600', 'Comedy', 'asyoulikeit'],
  ['Twelfth Night', '1601–02', 'Comedy', '12th night|twelfth night or what you will'],
  ["All's Well That Ends Well", '1604–05', 'Comedy', 'alls well'],
  ['Measure for Measure', '1604–05', 'Comedy', 'measure'],
  ['Troilus and Cressida', '1601–02', 'Comedy', 'troilus & cressida'],
  // Histories
  ['Henry VI, Part 1', '1591–92', 'History', '1 henry vi|henry 6 part 1|henry the sixth part 1|henry vi part one'],
  ['Henry VI, Part 2', '1590–91', 'History', '2 henry vi|henry 6 part 2|henry the sixth part 2|henry vi part two'],
  ['Henry VI, Part 3', '1590–91', 'History', '3 henry vi|henry 6 part 3|henry the sixth part 3|henry vi part three'],
  ['Richard III', '1592–93', 'History', 'richard 3'],
  ['King John', '1594–96', 'History', 'john'],
  ['Richard II', '1595–96', 'History', 'richard 2'],
  ['Henry IV, Part 1', '1596–97', 'History', '1 henry iv|henry 4 part 1|henry the fourth part 1|henry iv part one'],
  ['Henry IV, Part 2', '1597–98', 'History', '2 henry iv|henry 4 part 2|henry the fourth part 2|henry iv part two'],
  ['Henry V', '1598–99', 'History', 'henry 5|henry the fifth'],
  ['Henry VIII', '1612–13', 'History', 'henry 8|henry the eighth'],
  ['Edward III', '1592–93', 'History', 'edward 3|edward the third'],
  // Tragedies
  ['Titus Andronicus', '1591–92', 'Tragedy', 'titus'],
  ['Romeo and Juliet', '1594–95', 'Tragedy', 'romeo & juliet'],
  ['Julius Caesar', '1599–1600', 'Tragedy', 'caesar'],
  ['Hamlet', '1600–01', 'Tragedy', 'hamlet prince of denmark'],
  ['Othello', '1603–04', 'Tragedy', 'othello moor of venice'],
  ['King Lear', '1605–06', 'Tragedy', 'lear'],
  ['Macbeth', '1605–06', 'Tragedy', 'macbeth'],
  ['Antony and Cleopatra', '1606–07', 'Tragedy', 'antony & cleopatra|anthony and cleopatra'],
  ['Coriolanus', '1607–08', 'Tragedy', 'coriolanus'],
  ['Timon of Athens', '1605–08', 'Tragedy', 'timon'],
  // Late romances
  ['Pericles', '1607–08', 'Romance', 'pericles prince of tyre'],
  ['Cymbeline', '1609–10', 'Romance', 'cymbeline'],
  ["The Winter's Tale", '1610–11', 'Romance', 'winters tale'],
  ['The Tempest', '1611–12', 'Romance', 'tempest'],
  ['The Two Noble Kinsmen', '1613–14', 'Romance', 'two noble kinsmen'],
];

// Study guide content: 4-6 sentence plot summaries for the guide, plus a one-line
// teaser for the synopsis flashcards. `chars` lists the important characters shown in
// the guide; names shared across plays are still shown here but are skipped when
// building character -> play cards, so the card answer stays unambiguous.
const PLAY_GUIDE = {
  "The Two Gentlemen of Verona": {
    chars: ["Valentine", "Proteus", "Julia", "Silvia", "Launce", "Speed"],
    teaser: "Two best friends from Verona both fall for the Duke of Milan's daughter, and one betrays the other.",
    summary: "Valentine and Proteus are inseparable friends in Verona. Valentine leaves for Milan and falls for Silvia, the Duke's daughter, while Proteus stays behind with Julia. When Proteus visits Milan he instantly falls for Silvia too and betrays Valentine, getting him banished. Julia travels disguised as a boy and witnesses Proteus's treachery; in the forest, Valentine rescues Silvia from Proteus, and Proteus repents. The couples are reconciled, and the Duke pardons the outlaws.",
  },
  "The Taming of the Shrew": {
    chars: ["Petruchio", "Katherine", "Baptista", "Lucentio", "Grumio", "Tranio"],
    teaser: "A gentleman 'tames' a sharp-tongued heiress so that her younger sister can marry.",
    summary: "Baptista of Padua will not let his younger daughter Bianca marry until her sharp-tongued elder sister Katherine does. Petruchio arrives and agrees to marry Katherine for her dowry, then sets about 'taming' her with deprivation, contradiction, and theatrical behavior. Meanwhile Bianca's suitors compete in disguise, and Lucentio wins her by swapping identities with his servant Tranio. Katherine eventually submits to Petruchio's authority, and the play ends with a wager over which wife is most obedient.",
  },
  "The Comedy of Errors": {
    chars: ["Antipholus of Ephesus", "Antipholus of Syracuse", "Dromio of Ephesus", "Dromio of Syracuse", "Adriana", "Luciana"],
    teaser: "Two sets of identical twins, separated at birth, arrive in the same city and are mistaken for each other.",
    summary: "Two sets of identical twins — the Antipholus brothers and their servants, the Dromios — were separated in a shipwreck. Antipholus of Syracuse and his Dromio arrive in Ephesus, where Antipholus of Ephesus and his Dromio already live. A chain of mistaken identities follows: wives, merchants, and officers confuse the pairs, and one Antipholus is arrested while the other dines with his wife. The confusion ends when the twins meet, the abbess reveals herself as their mother, and the family is reunited.",
  },
  "Love's Labour's Lost": {
    chars: ["King Ferdinand", "Berowne", "Longaville", "Dumaine", "Rosaline", "Princess of France"],
    teaser: "Four noblemen swear off women to study, then immediately fall for a visiting princess and her ladies.",
    summary: "The King of Navarre and three lords swear to study for three years, fasting and avoiding women. Their oath collapses at once when the Princess of France arrives with her ladies, and each man secretly falls in love. A comic Spaniard, a pedant, a curate, and a page add to the confusion as love letters and disguises go astray. The men stage a masque of Russians to woo the ladies, who see through it. News of the French king's death ends the revels, and the women impose a year of penance before any marriages can take place.",
  },
  "A Midsummer Night's Dream": {
    chars: ["Puck", "Oberon", "Titania", "Bottom", "Hermia", "Lysander"],
    teaser: "Four young lovers and a troupe of actors wander into a fairy-haunted wood on midsummer night.",
    summary: "Theseus, Duke of Athens, is about to marry Hippolyta. Hermia loves Lysander, but her father wants her to marry Demetrius, so the lovers flee into the woods; Helena, who loves Demetrius, follows. In the same woods Oberon and Titania, king and queen of the fairies, are quarreling, and Oberon sends Puck to fetch a love potion. Puck's mistakes make both men love Helena, while Titania falls for Bottom, an actor whose head has been turned into an ass's. The potion is corrected, the lovers are paired properly, and the play ends with the wedding and Bottom's troupe performing a hilariously bad play.",
  },
  "The Merchant of Venice": {
    chars: ["Shylock", "Portia", "Antonio", "Bassanio", "Jessica", "Nerissa"],
    teaser: "A merchant pledges a pound of flesh to a moneylender, and a disguised heiress saves him in court.",
    summary: "Bassanio needs money to court Portia, so he borrows from Antonio, a merchant whose ships are at sea. Shylock, the Jewish moneylender, demands a pound of Antonio's flesh if the loan is not repaid. Portia, bound by her father's will to marry the man who chooses the right casket, marries Bassanio, and her maid Nerissa marries Gratiano. When Antonio's ships are reported lost, Shylock demands his bond in court. Portia arrives disguised as a lawyer, argues that Shylock may take flesh but not blood, and turns the law against him; the couples are reunited, and Shylock is forced to convert.",
  },
  "The Merry Wives of Windsor": {
    chars: ["Falstaff", "Mistress Ford", "Mistress Page", "Anne Page", "Fenton", "Doctor Caius"],
    teaser: "A fat knight tries to seduce two Windsor wives for their money and is pranked mercilessly.",
    summary: "Sir John Falstaff, short of money, decides to seduce two wealthy wives of Windsor, Mistress Ford and Mistress Page, sending them identical love letters. The wives compare notes and plot his humiliation. They arrange assignations and then hide him in a laundry basket, dump him in the river, and finally lure him to a midnight masquerade in the park. Falstaff is pinched and mocked by the disguised townsfolk, including the wives' husbands and a jealous Ford. The play ends with Falstaff admitted to the company and the young lovers Fenton and Anne Page allowed to marry.",
  },
  "Much Ado About Nothing": {
    chars: ["Beatrice", "Benedick", "Hero", "Claudio", "Don Pedro", "Don John"],
    teaser: "Two witty nobles deny their love while a young couple's wedding is wrecked by a villain's lie.",
    summary: "Don Pedro and his soldiers return to Messina, where Claudio falls for Hero and Benedick resumes his witty war with Beatrice. Don Pedro helps Claudio woo Hero, and the wedding is set; meanwhile the others trick Benedick and Beatrice into admitting their love for each other. Don John, the villainous brother, stages a scene that makes Claudio believe Hero has been unfaithful, and Claudio denounces her at the altar. Hero faints and is reported dead, while the bumbling constable Dogberry uncovers the plot. Claudio agrees to marry Hero's 'cousin' as penance, discovers it is Hero herself, and the two couples are married.",
  },
  "As You Like It": {
    chars: ["Rosalind", "Orlando", "Celia", "Touchstone", "Jaques", "Duke Frederick"],
    teaser: "A duke's daughter flees into the Forest of Arden disguised as a boy and tests the man who loves her.",
    summary: "Orlando, the youngest son of Sir Rowland de Boys, is persecuted by his brother Oliver and flees to the Forest of Arden. Rosalind, the Duke's daughter, is banished by her uncle and travels disguised as the boy Ganymede, accompanied by her cousin Celia and the clown Touchstone. In the forest Orlando hangs love poems for Rosalind, and Rosalind, still disguised, tests his love by pretending to cure him of it. The melancholy Jaques comments on the world, and the exiled Duke lives contentedly with his followers. Oliver repents, falls for Celia, and the play ends with four marriages and the restoration of the dukedom.",
  },
  "Twelfth Night": {
    chars: ["Viola", "Olivia", "Orsino", "Malvolio", "Feste", "Sir Toby Belch"],
    teaser: "A shipwrecked noblewoman disguises herself as a boy and serves the duke she loves.",
    summary: "Viola is shipwrecked on the coast of Illyria and believes her twin brother Sebastian is dead. She disguises herself as a boy, Cesario, and enters the service of Duke Orsino, who is wooing the Countess Olivia. Olivia falls for Cesario instead, while Viola secretly loves Orsino. Olivia's steward Malvolio is tricked into believing Olivia loves him, and his absurd yellow stockings and cross-gartering make him a laughingstock. Sebastian arrives, is mistaken for Cesario, and marries Olivia. Viola reveals herself, Orsino proposes to her, and Malvolio stalks off vowing revenge.",
  },
  "All's Well That Ends Well": {
    chars: ["Helena", "Bertram", "Countess of Rousillon", "King of France", "Parolles", "Lafeu"],
    teaser: "A physician's daughter cures a king, marries a reluctant count, and completes impossible tasks to win him back.",
    summary: "Helena, the orphaned daughter of a physician, loves Bertram, a young count who considers her beneath him. She cures the King of France of a fistula and is allowed to choose a husband; she chooses Bertram, who reluctantly marries her and then flees to the wars in Italy. Bertram vows he will never be her husband until she can get his ring from his finger and a child from his body. Helena follows him to Florence, disguises herself as a pilgrim, and arranges a bed-trick in which she takes the place of a woman Bertram is courting. She obtains the ring and becomes pregnant; Bertram returns home, is exposed, and finally accepts her.",
  },
  "Measure for Measure": {
    chars: ["Duke Vincentio", "Isabella", "Angelo", "Claudio", "Lucio", "Mariana"],
    teaser: "A puritanical deputy condemns a young man to death, and his sister is offered a corrupt bargain.",
    summary: "The Duke of Vienna, disturbed by the city's lax morals, leaves his puritanical deputy Angelo in charge and pretends to travel abroad. Angelo immediately condemns Claudio to death for impregnating his fiancée Juliet before marriage. Claudio's sister Isabella, about to become a nun, pleads for his life, and Angelo offers to spare Claudio if she sleeps with him. The Duke, disguised as a friar, arranges a bed-trick in which Mariana, Angelo's abandoned fiancée, takes Isabella's place. Angelo breaks his promise anyway, but the Duke returns, exposes him, and forces him to marry Mariana; Claudio is saved, and the Duke proposes to Isabella.",
  },
  "Troilus and Cressida": {
    chars: ["Troilus", "Cressida", "Pandarus", "Hector", "Achilles", "Ulysses"],
    teaser: "A Trojan prince and Cressida fall in love during the Trojan War, but she is exchanged to the Greek camp.",
    summary: "The Trojan War drags on with neither side able to win. Troilus, a Trojan prince, loves Cressida, and her uncle Pandarus arranges their meeting. Cressida's father has defected to the Greeks, and when she is exchanged for a Trojan prisoner she is taken to the Greek camp. There she yields to the Greek general Diomedes, and Troilus, watching in disguise, sees her betrayal. The Greek and Trojan heroes spend their time in bitter debate and single combat, with Achilles sulking in his tent until Patroclus's death draws him out. The play ends without resolution, with Troy still under siege and the lovers parted.",
  },
  "Henry VI, Part 1": {
    chars: ["Henry VI", "Joan of Arc", "Talbot", "Charles the Dauphin", "York", "Margaret"],
    teaser: "England's young king loses France to Joan of Arc and sees his nobles turn on one another.",
    summary: "Henry V has died, and his infant son Henry VI inherits a kingdom at war in France. The English nobles quarrel among themselves while the French, inspired by Joan of Arc, win several victories. Talbot, the English champion, is surrounded and killed in battle after the nobles fail to reinforce him. Joan is captured and burned, and the English position in France collapses. In England the rivalry between the houses of York and Lancaster begins to take shape, and Henry is pressured into marrying Margaret of Anjou, setting the stage for civil war.",
  },
  "Henry VI, Part 2": {
    chars: ["Henry VI", "Margaret", "Gloucester", "York", "Jack Cade", "Eleanor Cobham"],
    teaser: "A weak king's court is split by feuding nobles while a Kentish rebellion storms London.",
    summary: "Henry VI's weak rule allows the nobles to fight for power. The Duke of Gloucester, the king's honest uncle, is undermined by his enemies and murdered, while Cardinal Beaufort and the Duke of Suffolk dominate the court. Queen Margaret and Suffolk openly flaunt their affair, and the commons grow restless. Jack Cade leads a Kentish rebellion that storms London, and the rebels are only dispersed after Cade is killed. The Duke of York returns from Ireland, raises an army, and claims the crown, beginning the Wars of the Roses.",
  },
  "Henry VI, Part 3": {
    chars: ["Henry VI", "Margaret", "York", "Edward IV", "Warwick", "Lady Grey"],
    teaser: "York and Lancaster tear England apart in the Wars of the Roses.",
    summary: "The Wars of the Roses dominate the play as York and Lancaster fight for the throne. York captures Henry VI and is named heir, but Queen Margaret raises an army, kills York, and puts his head on the gates of York. York's sons — Edward, George, and Richard — continue the fight, and Edward is crowned Edward IV. Warwick switches sides, Henry is briefly restored, and Edward wins again at Barnet and Tewkesbury, where Henry's son is killed and Henry himself is murdered in the Tower. Richard, Duke of Gloucester, begins to emerge as the most ruthless of the victors.",
  },
  "Richard III": {
    chars: ["Richard III", "Lady Anne", "Clarence", "Buckingham", "Richmond", "Stanley"],
    teaser: "A scheming duke murders his way to the throne and falls at Bosworth.",
    summary: "Richard, Duke of Gloucester, is determined to become king. He has his brother Clarence murdered, woos Lady Anne over her husband's coffin, and helps remove the young princes who stand between him and the throne. After Edward IV's death, Richard has the princes imprisoned in the Tower and then killed, and he takes the crown. His reign is short and unstable; Buckingham rebels, and the Earl of Richmond invades from France. On the night before Bosworth Richard is haunted by the ghosts of his victims, and he is killed in battle; Richmond becomes Henry VII and marries Elizabeth of York to unite the houses.",
  },
  "King John": {
    chars: ["King John", "Faulconbridge", "Arthur", "Constance", "Eleanor of Aquitaine", "Cardinal Pandulph"],
    teaser: "An unpopular king fights France and the Church over his nephew's claim to the throne.",
    summary: "King John of England faces a rival claim from his nephew Arthur, backed by the King of France. War follows, and John's forces capture Arthur, who dies in suspicious circumstances. John is excommunicated by the Pope and forced to submit, while his nobles grow alienated. The Bastard, John's loyal and sardonic nephew, becomes the play's commentator on politics and national identity. John is poisoned by a monk, and his son Henry becomes king as the barons return to their allegiance; the play ends with the Bastard's patriotic speech about England.",
  },
  "Richard II": {
    chars: ["Richard II", "Bolingbroke", "John of Gaunt", "Mowbray", "Aumerle", "Queen Isabel"],
    teaser: "A vain king seizes his cousin's inheritance, and the cousin returns to take the crown.",
    summary: "Richard II is a vain and extravagant king who banishes his cousin Henry Bolingbroke and seizes the estates of Bolingbroke's father, John of Gaunt. Bolingbroke returns from exile to claim his inheritance, and the nobles flock to him. Richard's support collapses, and he is forced to give up the crown. Bolingbroke becomes Henry IV, and Richard is imprisoned in Pomfret Castle, where he is murdered by Sir Exton. The play ends with Henry IV vowing to go on crusade to atone for Richard's death.",
  },
  "Henry IV, Part 1": {
    chars: ["Henry IV", "Prince Hal", "Falstaff", "Hotspur", "Worcester", "Glendower"],
    teaser: "A king beset by rebels worries about his wayward son, who carouses with Falstaff.",
    summary: "Henry IV is troubled by rebellion and by his son Hal, the Prince of Wales, who spends his time drinking and carousing in Eastcheap with Sir John Falstaff. The Percy family, led by Hotspur, joins forces with the Welsh leader Glendower and the Scots Earl of Douglas to challenge the king. Hal promises to redeem himself, and at the Battle of Shrewsbury he saves his father and kills Hotspur in single combat. Falstaff survives by playing dead, and the rebellion is crushed, though the king still worries about his son's wild ways.",
  },
  "Henry IV, Part 2": {
    chars: ["Henry IV", "Prince Hal", "Falstaff", "Prince John", "Doll Tearsheet", "Justice Shallow"],
    teaser: "The king's health fails as rebellion sputters on, and the prince must reject his old companion.",
    summary: "The rebellion continues, but the king's health is failing. Falstaff travels through the countryside recruiting soldiers, taking bribes and collecting a ragtag army. Prince Hal keeps company with Falstaff and his cronies, but he is increasingly drawn toward his royal duties. The rebels are defeated by Prince John, and Henry IV dies, leaving Hal the crown. When Falstaff greets the new king with his usual familiarity, Hal rejects him publicly, and Falstaff is left to face the consequences of his old life.",
  },
  "Henry V": {
    chars: ["Henry V", "Fluellen", "Canterbury", "Katherine", "Pistol", "Montjoy"],
    teaser: "A young king invades France and wins a miraculous victory at Agincourt.",
    summary: "Henry V, now king, decides to press his claim to the French throne and invades France. His army is outnumbered and exhausted, but on St Crispin's Day at Agincourt he wins a stunning victory against the French. The play moves between the battlefield and the comic world of Pistol, Bardolph, and the Welsh captain Fluellen. After the victory Henry woos Princess Katherine of France and secures a peace treaty. The chorus reminds the audience that Henry's son will lose what his father won, but the play ends with the marriage and the hope of lasting peace.",
  },
  "Henry VIII": {
    chars: ["Wolsey", "Cromwell", "Anne Boleyn", "Catherine of Aragon", "Cranmer", "Gardiner"],
    teaser: "A king's divorce and remarriage set off a struggle between Cardinal Wolsey and the rising Cromwell.",
    summary: "Henry VIII's court is dominated by Cardinal Wolsey, who uses his power to advance himself. Henry falls for Anne Boleyn, and Wolsey's failure to secure the king's divorce from Catherine of Aragon brings about his downfall. The king breaks with Rome and appoints Thomas Cranmer as Archbishop of Canterbury. Catherine is divorced, Anne is crowned, and the play ends with the birth of Elizabeth and Cranmer's prophecy of England's future greatness. The tone is pageant-like, with falls from power and the triumph of the Tudor dynasty.",
  },
  "Edward III": {
    chars: ["Edward III", "Black Prince", "Countess of Salisbury", "King John of France", "David of Scotland", "Sir Walter Manny"],
    teaser: "An English king presses his claim to France and his son wins glory at Crécy.",
    summary: "Edward III of England presses his claim to the French crown and goes to war. The play follows his campaign in France, including a naval victory and the siege of Calais, and his son the Black Prince's triumph at Crécy. A subplot involves the Countess of Salisbury, whose virtue Edward tests and then respects. The French king John is captured, and the English celebrate their victories. The play ends with Edward's return to England and the birth of the Order of the Garter, though the historical chronicle leaves the war unresolved.",
  },
  "Titus Andronicus": {
    chars: ["Titus", "Tamora", "Aaron", "Lavinia", "Saturninus", "Lucius"],
    teaser: "A Roman general's ritual sacrifice triggers a cycle of rape, mutilation, and revenge.",
    summary: "Titus Andronicus, a Roman general, returns from war with the captive Queen Tamora and her sons. He sacrifices one of her sons in revenge for his own dead sons, and Tamora vows vengeance. With her lover Aaron she arranges the rape and mutilation of Titus's daughter Lavinia and the murder of two of his sons, framing them for the crime. Titus feigns madness, kills Tamora's sons, and serves them to her in a pie; he then kills Lavinia and Tamora, and is killed by Saturninus. Lucius, Titus's surviving son, becomes emperor and restores order.",
  },
  "Romeo and Juliet": {
    chars: ["Romeo", "Juliet", "Mercutio", "Tybalt", "Friar Laurence", "Capulet"],
    teaser: "Two young lovers from feuding families marry in secret, with fatal consequences.",
    summary: "Romeo and Juliet, the children of feuding families in Verona, meet at a party and fall in love. They marry in secret with Friar Laurence's help, but Romeo is banished after killing Tybalt in a street fight. Juliet's parents arrange her marriage to Paris, and the Friar gives her a potion that makes her appear dead. Romeo, not receiving the message, believes she is truly dead and kills himself in the tomb. Juliet wakes, finds him dead, and kills herself; the families' grief ends their feud.",
  },
  "Julius Caesar": {
    chars: ["Julius Caesar", "Brutus", "Cassius", "Mark Antony", "Calpurnia", "Casca"],
    teaser: "Roman senators assassinate a popular general, and civil war destroys the conspirators.",
    summary: "Julius Caesar returns to Rome in triumph, and his growing power alarms the senators. Cassius persuades Brutus that Caesar intends to become king, and the conspirators assassinate him on the Ides of March. Brutus allows Mark Antony to speak at the funeral, and Antony's speech turns the crowd against the conspirators. Civil war follows; Brutus and Cassius are defeated at Philippi, and both take their own lives. Antony and Octavius emerge as the rulers of Rome.",
  },
  "Hamlet": {
    chars: ["Hamlet", "Claudius", "Gertrude", "Ophelia", "Polonius", "Laertes"],
    teaser: "A Danish prince learns his uncle murdered his father and feigns madness while seeking revenge.",
    summary: "Hamlet, prince of Denmark, returns from university to find his father dead and his mother Gertrude married to his uncle Claudius, who has taken the throne. The ghost of Hamlet's father tells him that Claudius murdered him and demands revenge. Hamlet feigns madness, stages a play to test Claudius's guilt, and accidentally kills Polonius behind a curtain. Ophelia, Polonius's daughter, goes mad and drowns, and Laertes, her brother, returns to avenge her and his father. Claudius arranges a fencing match with a poisoned blade; Gertrude drinks poisoned wine, Laertes and Hamlet are both wounded, and Hamlet kills Claudius before dying himself. Fortinbras of Norway arrives to take the throne.",
  },
  "Othello": {
    chars: ["Othello", "Iago", "Desdemona", "Cassio", "Emilia", "Roderigo"],
    teaser: "A Moorish general is undone by his ensign's lies about his wife's fidelity.",
    summary: "Othello, a Moorish general in Venetian service, secretly marries Desdemona, the daughter of a senator. Iago, Othello's ensign, is passed over for promotion and plots revenge. He convinces Othello that Desdemona is having an affair with Cassio, using a handkerchief and a series of insinuations. Othello's jealousy grows until he smothers Desdemona in their bedchamber. Emilia, Iago's wife, reveals the truth, and Iago kills her; Othello, realizing his mistake, kills himself. Cassio is left to govern Cyprus, and Iago is taken away to be tortured.",
  },
  "King Lear": {
    chars: ["Lear", "Cordelia", "Goneril", "Regan", "Gloucester", "Edgar"],
    teaser: "An aging king divides his kingdom among his daughters and is cast out into a storm.",
    summary: "King Lear decides to divide his kingdom among his three daughters according to how much they love him. Goneril and Regan flatter him, but Cordelia refuses to exaggerate and is banished. Lear soon discovers that his elder daughters intend to strip him of his remaining power, and he is cast out into a storm. Meanwhile the Earl of Gloucester is betrayed by his illegitimate son Edmund and blinded by Regan and Cornwall. Edgar, Gloucester's legitimate son, disguises himself as a mad beggar and guides his father. Cordelia returns with a French army, but she and Lear are captured; she is hanged, and Lear dies of grief. Albany and Edgar restore order.",
  },
  "Macbeth": {
    chars: ["Macbeth", "Lady Macbeth", "Banquo", "Duncan", "Macduff", "Malcolm"],
    teaser: "A Scottish nobleman, urged on by his wife and a prophecy, murders his king and seizes the throne.",
    summary: "Macbeth, a Scottish nobleman, meets three witches who prophesy that he will become king. Encouraged by his wife, he murders King Duncan and takes the throne. He then kills Banquo, his friend, and the family of Macduff, a nobleman who has fled to England. Lady Macbeth descends into madness and dies, and Macbeth becomes a tyrant. Macduff and Malcolm raise an army, and Macbeth is killed in battle; Malcolm becomes king of Scotland.",
  },
  "Antony and Cleopatra": {
    chars: ["Mark Antony", "Cleopatra", "Enobarbus", "Octavius Caesar", "Charmian", "Octavia"],
    teaser: "A Roman general neglects his duties for the Queen of Egypt, and their world collapses at Actium.",
    summary: "Mark Antony, one of the triumvirs of Rome, neglects his duties for Cleopatra, queen of Egypt. His rival Octavius Caesar prepares for war, and Antony's forces are defeated at Actium when Cleopatra's fleet flees. Antony believes Cleopatra has betrayed him and attempts suicide, but survives long enough to be taken to her monument. Cleopatra, rather than be paraded in Caesar's triumph, kills herself with an asp. Caesar takes control of Egypt, and the play ends with the lovers united in death.",
  },
  "Coriolanus": {
    chars: ["Coriolanus", "Volumnia", "Aufidius", "Menenius", "Virgilia", "Sicinius"],
    teaser: "A proud Roman general is banished, joins Rome's enemies, and is talked out of destroying the city.",
    summary: "Caius Marcius, a proud Roman general, wins the name Coriolanus for his victory at Corioli. He returns to Rome and is nominated for consul, but his contempt for the common people and his refusal to show them his wounds turn them against him. He is banished and joins the Volscians, led by his old enemy Aufidius, and marches on Rome. His mother Volumnia and wife Virgilia plead with him to spare the city, and he relents. The Volscians see this as betrayal, and Aufidius has him killed.",
  },
  "Timon of Athens": {
    chars: ["Timon", "Apemantus", "Alcibiades", "Flavius", "Lucullus", "Ventidius"],
    teaser: "A generous Athenian gives away his fortune, is abandoned by his friends, and becomes a bitter hermit.",
    summary: "Timon, a wealthy and generous Athenian nobleman, gives away his fortune to friends and entertainers. When his money runs out he asks those friends for help and is refused by all of them. Bitter and disillusioned, he leaves Athens and lives in a cave, where he finds gold and gives it away to those who will use it to destroy the city. He invites his false friends to a final banquet and serves them stones and water. He dies alone, and the play ends with his epitaph and the city's continued troubles.",
  },
  "Pericles": {
    chars: ["Pericles", "Marina", "Thaisa", "Antiochus", "Helicanus", "Cerimon"],
    teaser: "A prince loses his wife and daughter at sea and is reunited with them years later.",
    summary: "Pericles, prince of Tyre, solves a riddle that reveals the incest of King Antiochus and flees for his life. He is shipwrecked, marries Thaisa, and loses her at sea when she appears to die in childbirth. Their daughter Marina is left with Cleon and Dionyza of Tarsus, but is kidnapped by pirates and sold to a brothel, where she preserves her virtue. Pericles, believing both wife and daughter dead, wanders in grief. He is reunited with Marina, and then with Thaisa, who has become a priestess of Diana; the family is restored.",
  },
  "Cymbeline": {
    chars: ["Cymbeline", "Imogen", "Posthumus", "Iachimo", "Cloten", "Belarius"],
    teaser: "A British king's daughter secretly marries a commoner, and a Roman scheme tests their love.",
    summary: "Cymbeline, king of Britain, has a daughter, Imogen, who secretly marries Posthumus, a commoner. Posthumus is banished to Rome, where the scheming Iachimo bets he can seduce Imogen; he hides in her bedchamber and steals a bracelet as false proof. Posthumus orders his servant Pisanio to kill her, but Pisanio helps her escape disguised as a boy. Imogen meets her long-lost brothers, who have been raised in the Welsh mountains, and the Roman invasion brings everyone together. Iachimo confesses, Posthumus is pardoned, and Cymbeline is reunited with his family and agrees to pay tribute to Rome.",
  },
  "The Winter's Tale": {
    chars: ["Leontes", "Hermione", "Perdita", "Polixenes", "Camillo", "Autolycus"],
    teaser: "A jealous king imprisons his queen and abandons his daughter; years later a statue brings reconciliation.",
    summary: "Leontes, king of Sicilia, becomes convinced that his pregnant queen Hermione has been unfaithful with his old friend Polixenes. He imprisons her, orders their newborn daughter abandoned, and puts Hermione on trial; she collapses when her son dies, and is reported dead. The baby is found by a shepherd and raised as Perdita. Years later Polixenes's son Florizel falls in love with Perdita, and the lovers flee to Sicilia. The truth of Perdita's birth is revealed, and a statue of Hermione comes to life, reuniting the family and ending Leontes's long penance.",
  },
  "The Tempest": {
    chars: ["Prospero", "Miranda", "Ariel", "Caliban", "Alonso", "Ferdinand"],
    teaser: "A deposed duke, now a sorcerer on an island, raises a storm to shipwreck his usurping brother.",
    summary: "Prospero, the rightful Duke of Milan, has been living on an island with his daughter Miranda since his brother Antonio usurped him. With the help of the spirit Ariel and the earth-monster Caliban, Prospero raises a storm that shipwrecks Antonio and the King of Naples. The king's son Ferdinand falls in love with Miranda, and Prospero tests their love. Meanwhile Caliban plots with two drunken servants to kill Prospero, but the plot fails. Prospero forgives his enemies, gives up his magic, frees Ariel, and prepares to return to Milan for Miranda's wedding.",
  },
  "The Two Noble Kinsmen": {
    chars: ["Palamon", "Arcite", "Emilia", "Jailer's Daughter", "Pirithous", "Artesius"],
    teaser: "Two Theban cousins imprisoned in Athens fall for the same woman and fight for her hand.",
    summary: "Two Theban cousins, Palamon and Arcite, are captured by Theseus of Athens and imprisoned together. Both fall in love with Emilia, Hippolyta's sister, and their friendship turns to rivalry. Arcite is released and wins favor at court, while Palamon escapes with the help of the jailer's daughter, who loves him. Theseus arranges a tournament: the winner will marry Emilia, and the loser will die. Arcite wins but is thrown from his horse and dies, leaving Palamon to marry Emilia. The jailer's daughter goes mad with unrequited love and is cared for by her father.",
  },
};
