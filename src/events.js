// ═══════════════════════════════════════════════════════════════
// SEVEN FALLS — Procedural Event System
// Generates unique events from templates + player context
// Expanded: 83 event templates across 47 categories.
// Each template: category, weight(1-5), slots (>=2 arrays of >=5 opts),
// text with {slot} placeholders, 2-3 choices with effect strings.
// ═══════════════════════════════════════════════════════════════

const EventEngine = {
  // ── EVENT TEMPLATES ───────────────────────────────────────
  // Each template has slots that get filled based on context
  templates: [
    // ── NPC MEETINGS ───────────────────────────────────────
    {
      category: 'npc',
      weight: 3,
      slots: {
        npc_role: ['wounded knight', 'blind prophet', 'crying child', 'armed monk', 'hermit scholar', 'fallen angel penitent', 'exorcist', 'treasure hunter', 'ghost of a martyr', 'talking skull'],
        npc_request: ['asks for water', 'begs for protection', 'offers a trade', 'pleads for a prayer', 'demands you leave', 'shares a warning', 'requests a verse', 'sings a broken hymn'],
      },
      text: 'A {npc_role} blocks your path and {npc_request}.',
      choices: [
        { text: 'Help them', effect: 'random_positive', weight: 2 },
        { text: 'Ignore them', effect: 'nothing', weight: 1 },
        { text: 'Ask what they know', effect: 'reveal_weakness', weight: 1 },
      ],
    },
    // ── TRAP ROOMS ─────────────────────────────────────────
    {
      category: 'trap',
      weight: 2,
      slots: {
        trap_type: ['collapsing floor', 'swinging blades', 'poison darts', 'fire jets', 'soul drain sigil', 'ceiling pendulum', 'hidden pit'],
        trap_trigger: ['steps on a loose stone', 'opens the wrong door', 'touches a cold wall', 'breathes the still air', 'gazes into a mirror'],
      },
      text: 'You enter a room with {trap_type}. It {trap_trigger}! React quickly!',
      choices: [
        { text: 'Dodge carefully', effect: 'skill_check', weight: 2 },
        { text: 'Charge through', effect: 'hp_cost_random', weight: 1 },
        { text: 'Find another way', effect: 'reveal_hidden', weight: 1 },
      ],
    },
    // ── TEMPTATIONS ────────────────────────────────────────
    {
      category: 'temptation',
      weight: 3,
      slots: {
        temptation: ['a chest overflowing with gold', 'a beautiful vision of heaven', 'a voice promising power', 'a mirror showing your deepest desire', 'a feast laid out on a table', 'a crown that whispers your name'],
        temptation_voice: ['coos from the dark', 'echoes like a friend', 'speaks in tongues', 'promises safety', 'laughs softly'],
      },
      text: 'You find {temptation}. It {temptation_voice}... You feel drawn to it.',
      choices: [
        { text: 'Resist the temptation', effect: 'buff_wisdom', weight: 1 },
        { text: 'Give in', effect: 'gold_or_hp_cost', weight: 2 },
        { text: 'Destroy it', effect: 'reveal_truth', weight: 1 },
      ],
    },
    // ── BATTLEFIELD DISCOVERIES ────────────────────────────
    {
      category: 'discovery',
      weight: 2,
      slots: {
        discovery: ['a dead soldier clutching a scroll', 'a demon corpse with something glowing inside', 'an altar with fresh blood', 'a circle of standing stones', 'a shattered reliquary'],
        discovery_detail: ['Its hand is still warm', 'The glow pulses', 'The blood is wet', 'The stones hum', 'Dust falls as you near'],
      },
      text: 'Among the ruins, you find {discovery}. {discovery_detail}.',
      choices: [
        { text: 'Investigate', effect: 'learn_verse_or_trap', weight: 2 },
        { text: 'Pray first', effect: 'safe_discover', weight: 1 },
        { text: 'Leave it alone', effect: 'nothing', weight: 1 },
      ],
    },
    // ── MORAL CHOICES ──────────────────────────────────────
    {
      category: 'moral',
      weight: 4,
      slots: {
        dilemma: ['a demon begging for mercy', 'a child trapped with a demon', 'a scholar who sold his soul for knowledge', 'a fellow traveler who stole your map', 'a mother weeping over a fallen son'],
        dilemma_price: ['costs you gold', 'costs you time', 'costs you blood', 'costs you a verse', 'costs you nothing but peace'],
      },
      text: 'You encounter {dilemma}. Resolving it {dilemma_price}.',
      choices: [
        { text: 'Show mercy', effect: 'mercy_reward', weight: 1 },
        { text: 'Choose justice', effect: 'justice_reward', weight: 1 },
        { text: 'Walk away', effect: 'neutral', weight: 1 },
      ],
    },
    // ── SCRIPTURE PUZZLES ──────────────────────────────────
    {
      category: 'puzzle',
      weight: 2,
      slots: {
        puzzle: ['a door with seven locks', 'a bridge that only appears when you speak truth', 'a circle of light that moves', 'a wall of fire with a narrow gap', 'a stair that counts your sins'],
        puzzle_clue: ['carved in latin', 'written in blood', 'sung by wind', 'shown in shadow', 'hinted by a star'],
      },
      text: 'Before you: {puzzle}. The way forward requires wisdom, {puzzle_clue}.',
      choices: [
        { text: 'Quote Psalm 23', effect: 'psalm_path', weight: 1 },
        { text: 'Quote John 3:16', effect: 'john_path', weight: 1 },
        { text: 'Quote Ephesians 6', effect: 'ephesians_path', weight: 1 },
        { text: 'Force through', effect: 'hp_cost_random', weight: 1 },
      ],
    },
    // ── TREASURE TEMPTATIONS ───────────────────────────────
    {
      category: 'treasure',
      weight: 2,
      slots: {
        treasure: ['a golden censer', 'a jeweled chalice', 'a crown of thorns', 'a silver sword', 'a glowing orb', 'an iron key of forgotten shape'],
        treasure_sign: ['radiates power', 'weeps light', 'bears a serpent mark', 'shivers in your hand', 'smells of incense'],
      },
      text: 'You find {treasure}. It {treasure_sign}. But it might be cursed...',
      choices: [
        { text: 'Take it carefully', effect: 'random_item', weight: 2 },
        { text: 'Pray over it first', effect: 'safe_item', weight: 1 },
        { text: 'Leave it', effect: 'nothing', weight: 1 },
      ],
    },
    // ── DEMON ENCOUNTERS (non-combat) ──────────────────────
    {
      category: 'demon_talk',
      weight: 3,
      slots: {
        demon_speech: ['"I can teach you things the Bible won\'t."', '"Power is yours if you just reach for it."', '"Your God has abandoned you here."', '"We are not so different, you and I."', '"Kneel, and the pain stops."'],
        demon_form: ['a figure of smoke', 'a beautiful liar', 'a child with black eyes', 'a winged horror', 'a face you once loved'],
      },
      text: 'A demon speaks: {demon_speech} It appears as {demon_form}.',
      choices: [
        { text: 'Counter with Scripture', effect: 'damage_demon', weight: 1 },
        { text: 'Listen', effect: 'gain_knowledge_lose_hp', weight: 1 },
        { text: 'Attack', effect: 'combat_start', weight: 1 },
      ],
    },
    // ── SHRINE EVENTS ──────────────────────────────────────
    {
      category: 'shrine',
      weight: 2,
      slots: {
        deity: ['the Lord', 'an angel', 'a saint', 'a prophet', 'a martyr', 'the Holy Spirit'],
        shrine_state: ['glows faintly', 'weeps oil', 'stands cracked', 'burns without fuel', 'echoes with song'],
      },
      text: 'An altar to {deity} stands before you. It {shrine_state}.',
      choices: [
        { text: 'Kneel and pray', effect: 'heal_or_verse', weight: 2 },
        { text: 'Offer gold', effect: 'buff_for_gold', weight: 1 },
        { text: 'Light a candle', effect: 'reveal_map', weight: 1 },
      ],
    },
    // ── SCROLL FINDS ───────────────────────────────────────
    {
      category: 'scroll',
      weight: 2,
      slots: {
        scroll_type: ['weathered', 'glowing', 'blood-stained', 'golden', 'shadowy', 'burning-cold'],
        scroll_word: ['a name of God', 'a forgotten psalm', 'a warning', 'a map', 'a prayer of the damned'],
      },
      text: 'A {scroll_type} scroll lies on the ground. {scroll_word} shimmers on its surface.',
      choices: [
        { text: 'Read it aloud', effect: 'learn_verse', weight: 2 },
        { text: 'Study it silently', effect: 'partial_verse', weight: 1 },
        { text: 'Burn it', effect: 'fire_damage_or_wisdom', weight: 1 },
      ],
    },
    // ── ENVIRONMENTAL HAZARDS ──────────────────────────────
    {
      category: 'hazard',
      weight: 2,
      slots: {
        hazard: ['rising floodwater', 'closing walls', 'swarming bats', 'a pit that opens beneath you', 'a cloud of locusts', 'a floor of broken glass'],
        hazard_sign: ['roars like the sea', 'grinds slowly', 'screams in the dark', 'breathes cold', 'hums with hunger'],
      },
      text: '{hazard}! It {hazard_sign} You must act fast!',
      choices: [
        { text: 'Use a verse to protect yourself', effect: 'verse_defense_check', weight: 2 },
        { text: 'Run for it', effect: 'speed_check', weight: 1 },
        { text: 'Stand firm', effect: 'courage_check', weight: 1 },
      ],
    },
    // ── RECURRING NEMESIS ENCOUNTERS ───────────────────────
    {
      category: 'nemesis_hint',
      weight: 1,
      slots: {
        clue: ['scratch marks on the wall', 'a message written in blood', 'footprints that circle back', 'a demon that flees at the sight of you', 'a torn scrap of your own map'],
        clue_tone: ['fresh and wet', 'old and cold', 'glowing faintly', 'smoking still', 'humming a tune you hate'],
      },
      text: 'You notice {clue}. It is {clue_tone}. The Stalker is near...',
      choices: [
        { text: 'Prepare for battle', effect: 'buff_for_nemesis', weight: 1 },
        { text: 'Set a trap', effect: 'trap_for_nemesis', weight: 1 },
        { text: 'Move quickly', effect: 'avoid_nemesis', weight: 1 },
      ],
    },
    // ── LORE EVENTS ────────────────────────────────────────
    {
      category: 'lore',
      weight: 1,
      slots: {
        lore_subject: ['the fall of the Watchers', 'why Lucifer rebelled', 'the meaning of the seven seals', 'what happened to the Garden of Eden', 'the first martyr\'s last words'],
        lore_scene: ['a city of white stone', 'a war in the heavens', 'a garden in flame', 'a throne grown silent', 'a chorus that broke'],
      },
      text: 'A vision shows you {lore_subject}... {lore_scene} unfolds before your eyes.',
      choices: [
        { text: 'Remember this', effect: 'permanent_knowledge', weight: 1 },
        { text: 'Reject the vision', effect: 'nothing', weight: 1 },
      ],
    },
    // ── VERSUS MULTIPLE DEMONS ─────────────────────────────
    {
      category: 'ambush',
      weight: 3,
      slots: {
        demon_count: ['two', 'three', 'four', 'five', 'six', 'a whole pack of'],
        ambush_place: ['from the ceiling', 'behind a false wall', 'out of the dark', 'through a rift', 'from the corpses'],
      },
      text: 'You walk into an ambush! {demon_count} demons leap {ambush_place}!',
      choices: [
        { text: 'Fight them all', effect: 'multi_combat', weight: 1 },
        { text: 'Use an area verse', effect: 'aoe_or_damage', weight: 1 },
        { text: 'Flee', effect: 'flee_or_damage', weight: 1 },
      ],
    },
    // ── HEALING EVENTS ─────────────────────────────────────
    {
      category: 'healing',
      weight: 2,
      slots: {
        source: ['a pool of living water', 'a tree bearing fruit', 'a ray of sunlight through the ceiling', 'a chorus of angelic voices', 'a spring of warm bloodless wine'],
        source_feel: ['radiates life', 'tingles on your skin', 'warms the cold', 'sings without sound', 'pulls the pain out'],
      },
      text: 'You find {source}. It {source_feel}.',
      choices: [
        { text: 'Drink / Partake', effect: 'heal_amount', weight: 2 },
        { text: 'Save it for later', effect: 'store_heal', weight: 1 },
        { text: 'Share with others', effect: 'heal_less_more_later', weight: 1 },
      ],
    },
    // ── CHOIR EVENTS ───────────────────────────────────────
    {
      category: 'choir',
      weight: 1,
      slots: {
        hymn: ['Amazing Grace', 'How Great Thou Art', 'A Mighty Fortress', 'Be Thou My Vision', 'It Is Well'],
        hymn_from: ['from a cracked chapel', 'from the depths', 'from above', 'from behind a veil', 'from the silence'],
      },
      text: 'You hear a distant choir singing "{hymn}" — it comes {hymn_from}.',
      choices: [
        { text: 'Join the singing', effect: 'full_heal_small', weight: 1 },
        { text: 'Listen carefully', effect: 'reveal_floor_secret', weight: 1 },
        { text: 'Walk toward the sound', effect: 'find_choir', weight: 1 },
      ],
    },
    // ── DEMON NEGOTIATION ──────────────────────────────────
    {
      category: 'negotiate',
      weight: 2,
      slots: {
        demon_offer: ['knowledge of your enemy', 'a powerful verse', 'safe passage', 'gold beyond measure', 'the location of the Stalker'],
        demon_price: ['a small favor', 'a drop of blood', 'a forgotten name', 'your shadow', 'a prayer reversed'],
      },
      text: '"I offer you {demon_offer}. All I ask is {demon_price}..."',
      choices: [
        { text: 'Accept the deal', effect: 'deal_with_demon', weight: 1 },
        { text: 'Refuse and fight', effect: 'combat_start', weight: 1 },
        { text: 'Turn the deal around', effect: 'reverseDeal', weight: 1 },
      ],
    },
    // ── SACRIFICE EVENTS ───────────────────────────────────
    {
      category: 'sacrifice',
      weight: 2,
      slots: {
        sacrifice: ['your sword', 'some of your blood', 'a cherished memory', 'years of your life', 'a verse you love'],
        sacrifice_return: ['great power', 'a cleared path', 'a fallen enemy', 'hidden sight', 'a second wind'],
      },
      text: 'The altar demands a sacrifice: {sacrifice}. In return, {sacrifice_return}.',
      choices: [
        { text: 'Sacrifice', effect: 'sacrifice_power', weight: 1 },
        { text: 'Refuse', effect: 'nothing', weight: 1 },
        { text: 'Offer something else', effect: 'alternative_sacrifice', weight: 1 },
      ],
    },
    // ── MAP REVEALS ────────────────────────────────────────
    {
      category: 'map_event',
      weight: 1,
      slots: {
        reveal: ['the location of the boss', 'a hidden path', 'a treasure room', 'an enemy patrol route', 'a shortcut upward'],
        reveal_medium: ['a vision', 'a whisper', 'a burning map', 'a dream', 'a reflection'],
      },
      text: 'A {reveal_medium} reveals {reveal}.',
      choices: [
        { text: 'Mark it on your map', effect: 'reveal_map_node', weight: 1 },
        { text: 'Forget it', effect: 'nothing', weight: 1 },
      ],
    },
    // ── ENEMY TRICKS ───────────────────────────────────────
    {
      category: 'enemy_trick',
      weight: 2,
      slots: {
        trick: ['illusionary walls', 'a demon disguised as a friend', 'a floor that gives way', 'a poison gas trap', 'a false exit'],
        trick_mask: ['shimmers as you watch', 'smiles like kin', 'cracks underfoot', 'hisses sweet', 'glows welcoming'],
      },
      text: 'It\'s a trap! {trick} {trick_mask}!',
      choices: [
        { text: 'React quickly', effect: 'dodge_check', weight: 2 },
        { text: 'Use a wisdom verse', effect: 'wisdom_reveal', weight: 1 },
        { text: 'Take the hit', effect: 'hp_cost_random', weight: 1 },
      ],
    },
    // ── FORSAKEN PLACES ────────────────────────────────────
    {
      category: 'forsaken',
      weight: 1,
      slots: {
        place: ['a church turned upside down', 'a cemetery where the dead walk', 'a library where books scream', 'a playground where shadows play', 'a nursery of forgotten prayers'],
        place_wrong: ['something is very wrong', 'the light bends away', 'the air tastes of ash', 'footsteps follow none', 'no echo answers'],
      },
      text: 'You enter {place}. {place_wrong} here.',
      choices: [
        { text: 'Pray for protection', effect: 'temporary_invincibility', weight: 1 },
        { text: 'Investigate', effect: 'random_encounter', weight: 1 },
        { text: 'Leave immediately', effect: 'nothing', weight: 1 },
      ],
    },
    // ── VISION EVENTS ──────────────────────────────────────
    {
      category: 'vision',
      weight: 2,
      slots: {
        vision: ['the end of the world', 'a city of gold descending', 'a great war in heaven', 'a lamb opening a scroll', 'the dead made alive'],
        vision_sense: ['you see the truth', 'you feel the weight', 'you hear the silence break', 'you know the name', 'you remember what was taken'],
      },
      text: 'A vision seizes you: {vision}. {vision_sense}.',
      choices: [
        { text: 'Accept the vision', effect: 'learn_verse', weight: 2 },
        { text: 'Resist it', effect: 'mental_resistance', weight: 1 },
        { text: 'Write it down', effect: 'permanent_knowledge', weight: 1 },
      ],
    },

    // ═════════════════════════════════════════════════════════
    // NEW CATEGORIES
    // ═════════════════════════════════════════════════════════

    // ── BOOK OF REVELATION ─────────────────────────────────
    {
      category: 'BOOK_OF_REVELATION',
      weight: 2,
      slots: {
        seal: ['the first seal', 'the fourth seal', 'the sixth seal', 'a seal of silence', 'the scroll\'s edge'],
        seal_sign: ['a pale horse rides', 'war breaks loose', 'famine follows', 'death is given power', 'the sky splits'],
      },
      text: 'A scroll trembles open: {seal} breaks and {seal_sign}.',
      choices: [
        { text: 'Witness the opening', effect: 'seal_opening', weight: 1 },
        { text: 'Seal it shut with prayer', effect: 'buff_wisdom', weight: 1 },
        { text: 'Flee the prophecy', effect: 'reveal_hidden', weight: 1 },
      ],
    },
    {
      category: 'BOOK_OF_REVELATION',
      weight: 2,
      slots: {
        trumpet: ['the first trumpet', 'the third trumpet', 'the fifth trumpet', 'the seventh trumpet', 'a trumpet of woe'],
        trumpet_effect: ['hail and fire mingled with blood', 'a burning mountain casts into the sea', 'a star falls named Wormwood', 'locusts with crowns ascend', 'the kingdoms of the world fall'],
      },
      text: 'On high, {trumpet} sounds: {trumpet_effect}.',
      choices: [
        { text: 'Cover your ears and pray', effect: 'trumpet_sound', weight: 1 },
        { text: 'Sing against it', effect: 'buff_defense', weight: 1 },
        { text: 'Charge the sound', effect: 'hp_cost_random', weight: 1 },
      ],
    },
    {
      category: 'BOOK_OF_REVELATION',
      weight: 2,
      slots: {
        bowl: ['the first bowl', 'the third bowl', 'the fifth bowl', 'the seventh bowl', 'a bowl of scorching heat'],
        bowl_plague: ['sores on the unrighteous', 'the sea turns to blood', 'the sun scorches with fire', 'darkness on the throne', 'a great earthquake'],
      },
      text: 'An angel pours {bowl} upon the land: {bowl_plague}.',
      choices: [
        { text: 'Endure it in faith', effect: 'bowl_of_wrath', weight: 1 },
        { text: 'Turn the plague aside', effect: 'reveal_truth', weight: 1 },
        { text: 'Loot the chaos', effect: 'gold_or_hp_cost', weight: 1 },
      ],
    },
    {
      category: 'BOOK_OF_REVELATION',
      weight: 1,
      slots: {
        revelation: ['a new heaven and new earth', 'the river of life', 'the bride adorned', 'the throne of God', 'the books opened'],
        revelation_who: ['an elder shows you', 'the Lamb unveils', 'an angel swears', 'a voice like many waters', 'the Spirit reveals'],
      },
      text: '{revelation_who} a prophetic vision: {revelation}.',
      choices: [
        { text: 'Receive the vision', effect: 'prophetic_vision', weight: 1 },
        { text: 'Write it for others', effect: 'permanent_knowledge', weight: 1 },
      ],
    },

    // ── MIRACLE ────────────────────────────────────────────
    {
      category: 'MIRACLE',
      weight: 2,
      slots: {
        water_body: ['a storm-tossed sea', 'a rushing river', 'a lake of black water', 'a flooded corridor', 'a wine-dark deep'],
        water_walk: ['the waves grow still', 'a path of light appears', 'foam hardens underfoot', 'the current parts', 'ice forms from His word'],
      },
      text: 'Before {water_body}, you are called to walk — and {water_walk}.',
      choices: [
        { text: 'Step out in faith', effect: 'walk_water', weight: 1 },
        { text: 'Wait for a boat', effect: 'safe_discover', weight: 1 },
        { text: 'Fear and turn back', effect: 'hp_cost_random', weight: 1 },
      ],
    },
    {
      category: 'MIRACLE',
      weight: 2,
      slots: {
        vessel: ['six stone jars', 'a cracked pitcher', 'an empty chalice', 'a wineskin split', 'a bronze basin'],
        wine_sign: ['water becomes wine', 'the hosts overflow', 'the bitter turns sweet', 'draughts multiply', 'the cup never empties'],
      },
      text: 'At the feast, {vessel} stand empty — and {wine_sign}.',
      choices: [
        { text: 'Fill them with faith', effect: 'water_to_wine', weight: 1 },
        { text: 'Drink deeply', effect: 'heal_amount', weight: 1 },
        { text: 'Share with the weary', effect: 'heal_less_more_later', weight: 1 },
      ],
    },
    {
      category: 'MIRACLE',
      weight: 2,
      slots: {
        loaves: ['five loaves', 'seven loaves', 'a single crust', 'bread from ashes', 'manna on the floor'],
        crowd: ['a hungry multitude', 'the dying in the pit', 'captive souls', 'your own party', 'a legion of shadows'],
      },
      text: 'You hold {loaves} before {crowd} and are told to feed them.',
      choices: [
        { text: 'Break and bless', effect: 'multiply_loaves', weight: 1 },
        { text: 'Keep it for yourself', effect: 'gold_or_hp_cost', weight: 1 },
        { text: 'Give all away', effect: 'mercy_reward', weight: 1 },
      ],
    },
    {
      category: 'MIRACLE',
      weight: 2,
      slots: {
        sick_one: ['a leper at the gate', 'a blind beggar', 'a paralytic on a mat', 'a feverish child', 'a demon-tormented soul'],
        sick_plea: ['"Lord, if you will"', '"Have mercy on me"', '"My friends lowered me through the roof"', '"Touch me and I am clean"', '"Only say the word"'],
      },
      text: '{sick_one} reaches out: {sick_plea}.',
      choices: [
        { text: 'Lay hands and heal', effect: 'heal_sick', weight: 1 },
        { text: 'Pray from afar', effect: 'learn_verse', weight: 1 },
        { text: 'Pass by', effect: 'neutral', weight: 1 },
      ],
    },

    // ── TEMPTATION OF CHRIST ───────────────────────────────
    {
      category: 'TEMPTATION_OF_CHRIST',
      weight: 2,
      slots: {
        wilderness: ['forty days of sun', 'a desert of bones', 'a silent waste', 'a valley of stones', 'a place no bird crosses'],
        wilderness_need: ['you are starving', 'you are parched', 'you are alone', 'you are watched', 'you are weary to death'],
      },
      text: 'You are driven into {wilderness}, where {wilderness_need}.',
      choices: [
        { text: 'Fast and endure', effect: 'wilderness_40', weight: 1 },
        { text: 'Cry out for help', effect: 'heal_amount', weight: 1 },
        { text: 'Curse the waste', effect: 'hp_cost_random', weight: 1 },
      ],
    },
    {
      category: 'TEMPTATION_OF_CHRIST',
      weight: 2,
      slots: {
        stone: ['a stone like bread', 'a rock that gleams', 'a loaf of granite', 'a pebble that hungers', 'a boulder of crusts'],
        devil_word: ['"Command these to become bread"', '"You need not suffer"', '"Fill your belly, prophet"', '"Is fasting not pride?"', '"The Father would not wish this"'],
      },
      text: 'The devil points to {stone}: {devil_word}.',
      choices: [
        { text: 'Refuse — man shall not live by bread alone', effect: 'stones_to_bread', weight: 1 },
        { text: 'Strike the stone', effect: 'combat_start', weight: 1 },
        { text: 'Pray the verse', effect: 'buff_wisdom', weight: 1 },
      ],
    },
    {
      category: 'TEMPTATION_OF_CHRIST',
      weight: 2,
      slots: {
        kingdom: ['all the kingdoms of the world', 'a throne of iron', 'a city of gold', 'an empire of shadow', 'a crown that blots the sun'],
        kingdom_price: ['"if you will bow to me"', '"if you but kneel"', '"for a single word"', '"if you doubt the Father"', '"if you take my hand"'],
      },
      text: 'The devil shows you {kingdom} and says: {kingdom_price}.',
      choices: [
        { text: 'Worship the Lord your God only', effect: 'kingdoms_offer', weight: 1 },
        { text: 'Reject and cast him out', effect: 'damage_demon', weight: 1 },
        { text: 'Consider it', effect: 'gold_or_hp_cost', weight: 1 },
      ],
    },

    // ── PARABLES ───────────────────────────────────────────
    {
      category: 'PARABLES',
      weight: 2,
      slots: {
        sheep: ['one lost sheep', 'a lamb on the cliff', 'a stray in the thorns', 'a wanderer from the fold', 'a bleating soul'],
        sheep_finder: ['a shepherd leaves ninety-nine', 'a lamp is lit', 'the hills are searched', 'angels rejoice', 'the fold opens'],
      },
      text: 'A parable unfolds: {sheep_finder} for {sheep}.',
      choices: [
        { text: 'Join the search', effect: 'lost_sheep', weight: 1 },
        { text: 'Carry it home', effect: 'heal_amount', weight: 1 },
        { text: 'Let it stray', effect: 'neutral', weight: 1 },
      ],
    },
    {
      category: 'PARABLES',
      weight: 2,
      slots: {
        son: ['the younger son', 'the brother who left', 'a prodigal returned', 'the one who squandered', 'a child in rags'],
        son_welcome: ['the father runs to him', 'a robe is brought', 'a feast is killed', 'a ring is given', 'music rises'],
      },
      text: 'You see {son_welcome} for {son}.',
      choices: [
        { text: 'Celebrate his return', effect: 'prodigal', weight: 1 },
        { text: 'Give him your share', effect: 'mercy_reward', weight: 1 },
        { text: 'Judge him as the elder brother', effect: 'justice_reward', weight: 1 },
      ],
    },
    {
      category: 'PARABLES',
      weight: 2,
      slots: {
        seed: ['the seed on the path', 'the seed on rock', 'the seed among thorns', 'the seed in good soil', 'the mustard seed'],
        sower_act: ['a sower goes out', 'birds devour some', 'the sun scorches some', 'thorns choke some', 'it yields thirtyfold'],
      },
      text: '{sower_act} — and {seed} is sown.',
      choices: [
        { text: 'Be the good soil', effect: 'sower_seed', weight: 1 },
        { text: 'Pull the thorns', effect: 'reveal_hidden', weight: 1 },
        { text: 'Scatter widely', effect: 'random_positive', weight: 1 },
      ],
    },
    {
      category: 'PARABLES',
      weight: 2,
      slots: {
        victim: ['a man beaten by robbers', 'a traveler left for dead', 'a stranger in a ditch', 'a wounded pilgrim', 'one stripped and bleeding'],
        samaritan: ['a Samaritan passes', 'a priest crosses over', 'a Levite hurries by', 'a foreigner stops', 'an enemy shows mercy'],
      },
      text: 'By the road, {victim}; {samaritan}.',
      choices: [
        { text: 'Bind his wounds', effect: 'good_samaritan', weight: 1 },
        { text: 'Give your coin', effect: 'heal_less_more_later', weight: 1 },
        { text: 'Pass by', effect: 'neutral', weight: 1 },
      ],
    },
    {
      category: 'PARABLES',
      weight: 2,
      slots: {
        talent: ['five talents', 'two talents', 'one talent', 'a bag of coins', 'a hidden measure'],
        talent_master: ['a master going on a journey', 'a king who tests', 'an owner who trusts', 'a lord who returns', 'a steward who reckons'],
      },
      text: '{talent_master} gives you {talent} and says, "Trade with this."',
      choices: [
        { text: 'Invest and multiply', effect: 'talents', weight: 1 },
        { text: 'Bury it safe', effect: 'store_heal', weight: 1 },
        { text: 'Waste it in fear', effect: 'hp_cost_random', weight: 1 },
      ],
    },

    // ── OLD TESTAMENT ──────────────────────────────────────
    {
      category: 'OLD_TESTAMENT',
      weight: 2,
      slots: {
        sea: ['the Red Sea', 'the parted deep', 'a wall of water', 'the dried sea-bed', 'the crushed waves'],
        sea_act: ['Moses lifts his staff', 'a wind drives all night', 'the waters stand like walls', 'Israel walks through', 'the Egyptians follow'],
      },
      text: '{sea_act} at {sea}.',
      choices: [
        { text: 'Walk through the wall', effect: 'red_sea', weight: 1 },
        { text: 'Raise your staff too', effect: 'reveal_map', weight: 1 },
        { text: 'Wait on the shore', effect: 'safe_discover', weight: 1 },
      ],
    },
    {
      category: 'OLD_TESTAMENT',
      weight: 2,
      slots: {
        furnace: ['a fiery furnace', 'sevenfold flames', 'a burning pit', 'a kiln of Nebuchadnezzar', 'a blaze that eats stone'],
        furnace_men: ['three men are thrown in', 'a fourth walks among them', 'the bonds are loosed', 'not a hair is singed', 'the king trembles'],
      },
      text: '{furnace_men} into {furnace}.',
      choices: [
        { text: 'Step into the flame unbound', effect: 'fiery_furnace', weight: 1 },
        { text: 'Call the fourth figure', effect: 'buff_defense', weight: 1 },
        { text: 'Refuse and be thrown', effect: 'hp_cost_random', weight: 1 },
      ],
    },
    {
      category: 'OLD_TESTAMENT',
      weight: 2,
      slots: {
        den: ['a den of lions', 'a pit of starving cats', 'a cave of teeth', 'Darius\'s prison', 'a hungry dark'],
        den_man: ['Daniel is cast in', 'an angel shuts the mouths', 'the lions will not touch him', 'the accusers are thrown', 'the king believes'],
      },
      text: '{den_man} into {den}.',
      choices: [
        { text: 'Pray as the lions watch', effect: 'lions_den', weight: 1 },
        { text: 'Stand still and trust', effect: 'combat_bonus', weight: 1 },
        { text: 'Fight the beasts', effect: 'multi_combat', weight: 1 },
      ],
    },
    {
      category: 'OLD_TESTAMENT',
      weight: 1,
      slots: {
        flood: ['the great flood', 'rising waters', 'the window of heaven', 'the broken deep', 'forty days of rain'],
        flood_ark: ['an ark rides the wave', 'the dove finds no rest', 'the raven does not return', 'the mountain appears', 'the rainbow is set'],
      },
      text: '{flood_ark} as {flood} covers the world.',
      choices: [
        { text: 'Build and board', effect: 'great_flood', weight: 1 },
        { text: 'Send out the dove', effect: 'reveal_map', weight: 1 },
        { text: 'Swim the deluge', effect: 'hp_cost_random', weight: 1 },
      ],
    },
    {
      category: 'OLD_TESTAMENT',
      weight: 1,
      slots: {
        babel: ['the tower of Babel', 'a ziggurat of pride', 'a city of one tongue', 'a stair to heaven', 'a monument of confusion'],
        babel_act: ['they build to the sky', 'the Lord confounds speech', 'languages scatter', 'the work halts', 'the people are dispersed'],
      },
      text: '{babel_act} at {babel}.',
      choices: [
        { text: 'Speak the true tongue', effect: 'babel', weight: 1 },
        { text: 'Topple a stone', effect: 'reveal_secret', weight: 1 },
        { text: 'Join the builders', effect: 'gold_or_hp_cost', weight: 1 },
      ],
    },

    // ── ANGELIC ENCOUNTERS ─────────────────────────────────
    {
      category: 'ANGELIC_ENCOUNTERS',
      weight: 2,
      slots: {
        angel: ['a seraph with six wings', 'a guardian with a drawn sword', 'a messenger in white', 'a cherub of light', 'an angel of the Lord'],
        angel_task: ['blocks your path with flame', 'bears a sealed letter', 'heals a wound unseen', 'names you by your true name', 'points to a hidden door'],
      },
      text: '{angel} appears and {angel_task}.',
      choices: [
        { text: 'Fall to your knees', effect: 'angel_appears', weight: 1 },
        { text: 'Ask its errand', effect: 'angel_truth', weight: 1 },
        { text: 'Draw your weapon', effect: 'combat_start', weight: 1 },
      ],
    },
    {
      category: 'ANGELIC_ENCOUNTERS',
      weight: 1,
      slots: {
        fight: ['a demon of the pit', 'a prince of air', 'a legioned horror', 'the Stalker\'s scout', 'a beast with many heads'],
        angel_fight: ['an archangel descends', 'Michael unsheathes', 'a host surrounds', 'the angel stands between', 'light splits the dark'],
      },
      text: '{angel_fight} as {fight} charges you.',
      choices: [
        { text: 'Fight beside the angel', effect: 'angel_fights', weight: 1 },
        { text: 'Let the angel finish it', effect: 'combat_bonus', weight: 1 },
        { text: 'Flee the crossfire', effect: 'flee_or_damage', weight: 1 },
      ],
    },
    {
      category: 'ANGELIC_ENCOUNTERS',
      weight: 1,
      slots: {
        truth: ['why the dungeon exists', 'the name of the Stalker', 'the weakness of Lucifer', 'the fate of the fallen', 'the price of mercy'],
        truth_how: ['the angel whispers', 'a scroll unfurls in light', 'the angel touches your brow', 'a star spells it out', 'silence speaks it'],
      },
      text: 'The angel reveals {truth} — {truth_how}.',
      choices: [
        { text: 'Receive the truth', effect: 'angel_truth', weight: 1 },
        { text: 'Question it', effect: 'reveal_weakness', weight: 1 },
      ],
    },
    {
      category: 'ANGELIC_ENCOUNTERS',
      weight: 1,
      slots: {
        block: ['a blade of fire', 'a wall of wings', 'a sealed gate', 'a river of light', 'a standing rank of host'],
        block_reason: ['"You are not ready"', '"The way is guarded"', '"Pride bars this door"', '"Wait, little one"', '"Faith first"'],
      },
      text: 'The angel raises {block}: {block_reason}.',
      choices: [
        { text: 'Wait in obedience', effect: 'angel_blocks', weight: 1 },
        { text: 'Prove your faith', effect: 'buff_wisdom', weight: 1 },
        { text: 'Force past', effect: 'hp_cost_random', weight: 1 },
      ],
    },

    // ── DEMON NATURE ───────────────────────────────────────
    {
      category: 'DEMON_NATURE',
      weight: 2,
      slots: {
        trueform: ['a writhing mass of eyes', 'a serpent of ash', 'a giant of smoke', 'a chorus of faces', 'a thing without shape'],
        trueform_act: ['it tears off its disguise', 'the mask melts', 'the lie burns away', 'its true name screams', 'the veil drops'],
      },
      text: 'The demon sheds its guise: {trueform_act} into {trueform}.',
      choices: [
        { text: 'Name it by its true name', effect: 'true_form', weight: 1 },
        { text: 'Strike the weakness', effect: 'damage_demon', weight: 1 },
        { text: 'Shield your eyes', effect: 'buff_defense', weight: 1 },
      ],
    },
    {
      category: 'DEMON_NATURE',
      weight: 1,
      slots: {
        history: ['how the dungeon was built', 'who first opened the pit', 'why the souls are trapped', 'the Stalker\'s origin', 'Lucifer\'s prison design'],
        history_tell: ['the demon laughs as it speaks', 'it weeps old memory', 'it carves it in frost', 'it shows you in dream', 'it trades the tale for silence'],
      },
      text: 'The demon reveals {history} — {history_tell}.',
      choices: [
        { text: 'Listen and remember', effect: 'demon_history', weight: 1 },
        { text: 'Trade a secret back', effect: 'reverseDeal', weight: 1 },
        { text: 'Reject the lie', effect: 'reveal_truth', weight: 1 },
      ],
    },
    {
      category: 'DEMON_NATURE',
      weight: 2,
      slots: {
        beg: ['a thrall of the pit', 'a duke brought low', 'a whispering wretch', 'a once-bright fallen', 'a thing that was a man'],
        beg_plea: ['"End me, pilgrim"', '"I cannot bear the dark"', '"Kill me, I beg"', '"Let me sleep"', '"Free me from this form"'],
      },
      text: '{beg} grovels: {beg_plea}.',
      choices: [
        { text: 'Grant its release', effect: 'begs_death', weight: 1 },
        { text: 'Bind it to your service', effect: 'combat_bonus', weight: 1 },
        { text: 'Leave it to suffer', effect: 'neutral', weight: 1 },
      ],
    },

    // ── COMBAT VARIANTS ────────────────────────────────────
    {
      category: 'COMBAT_VARIANTS',
      weight: 2,
      slots: {
        foe: ['a chained brute', 'a pit champion', 'a warden of the floor', 'a screaming host', 'a beast of the deep'],
        force_why: ['it blocks the only door', 'it answers your every step', 'the floor demands a duel', 'it will not let you pass', 'the Stalker sent it'],
      },
      text: '{foe} steps in — {force_why}.',
      choices: [
        { text: 'Fight, no choice', effect: 'forced_combat', weight: 1 },
        { text: 'Try to talk', effect: 'demon_talk', weight: 1 },
        { text: 'Look for a way around', effect: 'reveal_hidden', weight: 1 },
      ],
    },
    {
      category: 'COMBAT_VARIANTS',
      weight: 2,
      slots: {
        condition: ['no fire may touch it', 'only wisdom can wound', 'you are timed', 'mercy alone ends it', 'silence must be kept'],
        condition_foe: ['a shade of glass', 'a judge of lies', 'a ticking horror', 'a weeping ghost', 'a mute specter'],
      },
      text: 'The foe is {condition_foe} — and {condition}.',
      choices: [
        { text: 'Fight under the condition', effect: 'combat_condition', weight: 1 },
        { text: 'Refuse the terms', effect: 'combat_start', weight: 1 },
        { text: 'Study the condition', effect: 'reveal_weakness', weight: 1 },
      ],
    },
    {
      category: 'COMBAT_VARIANTS',
      weight: 2,
      slots: {
        reward: ['a relic if you win', 'a verse if you survive', 'gold for the kill', 'freedom for the captive', 'a blade for the bold'],
        reward_foe: ['a cowardly duelist', 'a gambling demon', 'a bound titan', 'a boastful knight', 'a doomed champion'],
      },
      text: '{reward_foe} offers {reward}.',
      choices: [
        { text: 'Fight for the reward', effect: 'combat_reward', weight: 1 },
        { text: 'Take the reward without fighting', effect: 'gold_or_hp_cost', weight: 1 },
        { text: 'Walk away', effect: 'neutral', weight: 1 },
      ],
    },

    // ── GEOGRAPHIC ─────────────────────────────────────────
    {
      category: 'GEOGRAPHIC',
      weight: 2,
      slots: {
        river: ['a black river', 'a river of memory', 'a tide of the dead', 'a silver current', 'a flood of forgetfulness'],
        river_cross: ['a bridge of bone', 'a ferry with no master', 'stones that rise', 'a ford of fire', 'a path that sinks'],
      },
      text: 'You reach {river} crossed only by {river_cross}.',
      choices: [
        { text: 'Cross carefully', effect: 'river_cross', weight: 1 },
        { text: 'Wade through', effect: 'hp_cost_random', weight: 1 },
        { text: 'Seek another bank', effect: 'reveal_hidden', weight: 1 },
      ],
    },
    {
      category: 'GEOGRAPHIC',
      weight: 2,
      slots: {
        mountain: ['a spike of cold stone', 'a stair cut in cliff', 'a peak of bone', 'a climb of ash', 'a ridge of glass'],
        mountain_toll: ['the air thins', 'the wind cuts', 'the path crumbles', 'cold bites', 'something follows'],
      },
      text: 'You begin {mountain}; {mountain_toll}.',
      choices: [
        { text: 'Climb on', effect: 'mountain_climb', weight: 1 },
        { text: 'Rest and pray', effect: 'heal_amount', weight: 1 },
        { text: 'Turn back', effect: 'avoid_nemesis', weight: 1 },
      ],
    },
    {
      category: 'GEOGRAPHIC',
      weight: 1,
      slots: {
        desert: ['a waste of salt', 'a dune of skulls', 'a plain of dust', 'a barren red flat', 'a horizon of nothing'],
        desert_danger: ['the sun blinds', 'thirst claws', 'mirrages lie', 'the sand drinks sound', 'bones shift underfoot'],
      },
      text: 'You cross {desert} where {desert_danger}.',
      choices: [
        { text: 'Press on', effect: 'desert_waste', weight: 1 },
        { text: 'Conserve what you have', effect: 'store_heal', weight: 1 },
        { text: 'Pray for water', effect: 'heal_amount', weight: 1 },
      ],
    },
    {
      category: 'GEOGRAPHIC',
      weight: 1,
      slots: {
        lake: ['a frozen lake', 'a sheet of black ice', 'a glass plain', 'a rink of the dead', 'a mirror of frost'],
        lake_hazard: ['it cracks', 'voices sing below', 'shadow moves under', 'it reflects a lie', 'it burns cold'],
      },
      text: 'You stand on {lake}; {lake_hazard}.',
      choices: [
        { text: 'Skate across', effect: 'frozen_lake', weight: 1 },
        { text: 'Break the ice to see', effect: 'learn_verse_or_trap', weight: 1 },
        { text: 'Go around', effect: 'reveal_hidden', weight: 1 },
      ],
    },
    {
      category: 'GEOGRAPHIC',
      weight: 1,
      slots: {
        vent: ['a volcanic vent', 'a pit of molten rock', 'a geyser of flame', 'a crack that breathes fire', 'a river of lava'],
        vent_use: ['it lights the dark', 'it forges or burns', 'it guards a door', 'it powers a trap', 'it sings in heat'],
      },
      text: 'You reach {vent}; {vent_use}.',
      choices: [
        { text: 'Use the heat', effect: 'volcanic_vent', weight: 1 },
        { text: 'Cool it with a verse', effect: 'fiery_furnace', weight: 1 },
        { text: 'Avoid the glow', effect: 'avoid_nemesis', weight: 1 },
      ],
    },

    // ── TEMPORAL ───────────────────────────────────────────
    {
      category: 'TEMPORAL',
      weight: 1,
      slots: {
        loop: ['the last minute repeats', 'the room resets', 'the fight begins again', 'the door re-locks', 'the words return'],
        loop_cause: ['a clock of glass', 'a demon\'s curse', 'a broken hour', 'a weeping saint', 'the dungeon\'s breath'],
      },
      text: 'A {loop_cause} traps you — {loop}.',
      choices: [
        { text: 'Break the loop with a verse', effect: 'time_loop', weight: 1 },
        { text: 'Endure it', effect: 'buff_wisdom', weight: 1 },
        { text: 'Run the loop', effect: 'random_positive', weight: 1 },
      ],
    },
    {
      category: 'TEMPORAL',
      weight: 1,
      slots: {
        freeze: ['the world holds still', 'a breath hangs', 'the Stalker freezes', 'a blade stops', 'time knots'],
        freeze_why: ['an angel stays it', 'a verse catches it', 'the dungeon sleeps', 'a relic hums', 'your prayer holds'],
      },
      text: '{freeze_why}: {freeze}.',
      choices: [
        { text: 'Act in the stillness', effect: 'time_freeze', weight: 1 },
        { text: 'Pray through it', effect: 'buff_defense', weight: 1 },
        { text: 'Watch and wait', effect: 'reveal_map', weight: 1 },
      ],
    },
    {
      category: 'TEMPORAL',
      weight: 1,
      slots: {
        past: ['the dungeon as it was built', 'a monk who first fell', 'Lucifer\'s first prison', 'a village above', 'the first seal'],
        past_sense: ['you stand unseen', 'you hear their prayers', 'you feel their dread', 'you know their names', 'you taste their fear'],
      },
      text: 'A vision pulls you to {past} — {past_sense}.',
      choices: [
        { text: 'Learn from the past', effect: 'past_vision', weight: 1 },
        { text: 'Change nothing', effect: 'permanent_knowledge', weight: 1 },
      ],
    },
    {
      category: 'TEMPORAL',
      weight: 1,
      slots: {
        future: ['your own death', 'the floor\'s end', 'Lucifer\'s throne', 'a friend\'s fall', 'the breaking of the seal'],
        future_how: ['a mirror shows', 'a star writes', 'a voice warns', 'the lamb unveils', 'the scroll turns'],
      },
      text: '{future_how} a future vision: {future}.',
      choices: [
        { text: 'Prepare for it', effect: 'future_vision', weight: 1 },
        { text: 'Deny it', effect: 'courage_check', weight: 1 },
      ],
    },
    {
      category: 'TEMPORAL',
      weight: 1,
      slots: {
        dejavu: ['you have stood here', 'you have heard this', 'you have spoken this', 'you have died this', 'you have seen this face'],
        dejavu_source: ['a ripple in time', 'a demon\'s echo', 'an angel\'s mark', 'a wound that repeats', 'a song returning'],
      },
      text: 'A {dejavu_source} — {dejavu}.',
      choices: [
        { text: 'Trust the feeling', effect: 'deja_vu', weight: 1 },
        { text: 'Ignore it', effect: 'random_positive', weight: 1 },
        { text: 'Map the pattern', effect: 'reveal_map', weight: 1 },
      ],
    },

    // ── MORAL AMBIGUOUS ────────────────────────────────────
    {
      category: 'MORAL_AMBIGUOUS',
      weight: 2,
      slots: {
        no_right: ['a child who is also a trap', 'a friend who is a demon', 'a mercy that kills', 'a truth that destroys', 'a rescue that dooms'],
        no_right_stakes: ['both paths bleed', 'no clean end', 'the cost is paid either way', 'innocence is already lost', 'the dungeon watches'],
      },
      text: 'You face {no_right_stakes}: {no_right}.',
      choices: [
        { text: 'Choose the lesser wound', effect: 'no_right', weight: 1 },
        { text: 'Refuse to choose', effect: 'neutral', weight: 1 },
        { text: 'Pray for a third way', effect: 'third_option', weight: 1 },
      ],
    },
    {
      category: 'MORAL_AMBIGUOUS',
      weight: 2,
      slots: {
        both_cost: ['gold and a life', 'a verse and blood', 'time and mercy', 'pride and peace', 'a soul and safety'],
        both_cost_scene: ['the scale tips', 'the price is shown', 'the debt is called', 'the bargain bites', 'the ledger opens'],
      },
      text: '{both_cost_scene}: every answer costs {both_cost}.',
      choices: [
        { text: 'Pay in gold', effect: 'both_cost', weight: 1 },
        { text: 'Pay in blood', effect: 'hp_cost_random', weight: 1 },
        { text: 'Pay in both', effect: 'sacrifice_power', weight: 1 },
      ],
    },
    {
      category: 'MORAL_AMBIGUOUS',
      weight: 2,
      slots: {
        third: ['a hidden passage', 'a silent prayer', 'a surrendered weapon', 'a spoken name', 'a broken seal'],
        third_scene: ['no one expected', 'the dungeon hid', 'the demon missed', 'the angel left', 'you never tried'],
      },
      text: 'The choice seems forced — but {third_scene} a {third}.',
      choices: [
        { text: 'Take the hidden way', effect: 'third_option', weight: 1 },
        { text: 'Pick the obvious lesser', effect: 'no_right', weight: 1 },
        { text: 'Walk away', effect: 'neutral', weight: 1 },
      ],
    },

    // ── HIDDEN ROOM ────────────────────────────────────────
    {
      category: 'HIDDEN_ROOM',
      weight: 1,
      slots: {
        room: ['a vault behind the altar', 'a crawlspace in the wall', 'a room under the floor', 'a pocket behind the veil', 'a cell no key fits'],
        room_reward: ['a cache of verses', 'forgotten gold', 'a sleeping relic', 'a bound ally', 'a map of the deep'],
      },
      text: 'You find {room} — inside, {room_reward}.',
      choices: [
        { text: 'Claim the prize', effect: 'secret_reward', weight: 1 },
        { text: 'Bless the place', effect: 'permanent_knowledge', weight: 1 },
        { text: 'Leave it sealed', effect: 'nothing', weight: 1 },
      ],
    },

    // ── TRADER DEMONS ──────────────────────────────────────
    {
      category: 'TRADER_DEMONS',
      weight: 2,
      slots: {
        trader: ['a merchant with too many eyes', 'a hag of the market', 'a duke in finery', 'a peddler of souls', 'a smith of the pit'],
        trader_goods: ['a verse for a memory', 'gold for a year', 'a blade for a name', 'sight for a sin', 'power for a prayer'],
      },
      text: '{trader} unfurls its wares: {trader_goods}.',
      choices: [
        { text: 'Trade fairly', effect: 'demon_trade', weight: 1 },
        { text: 'Haggle hard', effect: 'reverseDeal', weight: 1 },
        { text: 'Rob the stall', effect: 'combat_start', weight: 1 },
      ],
    },
    {
      category: 'TRADER_DEMONS',
      weight: 1,
      slots: {
        goods: ['a jar of stolen light', 'a clock that runs backward', 'a feather of a fallen', 'a vial of silence', 'a coin that lies'],
        goods_cost: ['your reflection', 'a day of life', 'a forgotten name', 'a drop of grace', 'a verse you know'],
      },
      text: 'Unusual goods: {goods}, priced in {goods_cost}.',
      choices: [
        { text: 'Buy the curiosity', effect: 'unusual_goods', weight: 1 },
        { text: 'Refuse the price', effect: 'nothing', weight: 1 },
        { text: 'Counter with Scripture', effect: 'damage_demon', weight: 1 },
      ],
    },

    // ── GAMBLING ───────────────────────────────────────────
    {
      category: 'GAMBLING',
      weight: 1,
      slots: {
        bet: ['your gold on the throw', 'your life on the card', 'a soul on the wheel', 'your verse on the flip', 'the floor on the dice'],
        bet_demon: ['a grinning gamester', 'a duke of chance', 'a shade with loaded bones', 'a liar in silk', 'the Stalker\'s bookie'],
      },
      text: '{bet_demon} invites you to wager {bet}.',
      choices: [
        { text: 'Place the bet', effect: 'bet_gold', weight: 1 },
        { text: 'Cheat with a verse', effect: 'reveal_truth', weight: 1 },
        { text: 'Walk from the table', effect: 'neutral', weight: 1 },
      ],
    },
    {
      category: 'GAMBLING',
      weight: 1,
      slots: {
        dice: ['bones that whisper', 'dice of frozen tears', 'a wheel of eyes', 'cards of the damned', 'a coin of two faces'],
        dice_stakes: ['double or nothing', 'a life for a life', 'gold for gold', 'a verse for freedom', 'pride for power'],
      },
      text: 'A game of {dice} with stakes: {dice_stakes}.',
      choices: [
        { text: 'Roll the bones', effect: 'dice_demon', weight: 1 },
        { text: 'Let fate decide', effect: 'random_positive', weight: 1 },
        { text: 'Refuse the game', effect: 'nothing', weight: 1 },
      ],
    },

    // ── RIDDLE ─────────────────────────────────────────────
    {
      category: 'RIDDLE',
      weight: 2,
      slots: {
        riddle: ['what walks on four, then two, then three', 'what has a voice but no mouth', 'what dies the moment it speaks', 'what the lion and lamb share', 'what seals cannot hold'],
        riddle_keeper: ['a sphinx of ash', 'a monk of puzzles', 'a demon of wit', 'a child of riddles', 'the gate itself'],
      },
      text: '{riddle_keeper} poses: "{riddle}?"',
      choices: [
        { text: 'Answer with a verse', effect: 'answer_riddle', weight: 1 },
        { text: 'Guess aloud', effect: 'dodge_check', weight: 1 },
        { text: 'Admit you know not', effect: 'buff_wisdom', weight: 1 },
      ],
    },

    // ── CHORUS OF HELL ─────────────────────────────────────
    {
      category: 'CHORUS_OF_HELL',
      weight: 2,
      slots: {
        hellsong: ['a hymn of hate', 'a liturgy of lies', 'a chant of the pit', 'a song that bends will', 'a chorus of the damned'],
        hellsong_effect: ['it pulls your feet', 'it clouds your prayer', 'it lifts the dark', 'it steals your name', 'it opens a wound'],
      },
      text: 'Demons sing {hellsong} — {hellsong_effect}.',
      choices: [
        { text: 'Counter with praise', effect: 'counter_praise', weight: 1 },
        { text: 'Join the chorus', effect: 'join_chorus', weight: 1 },
        { text: 'Silence them by force', effect: 'combat_start', weight: 1 },
      ],
    },

    // ── SACRIFICIAL ALTAR ──────────────────────────────────
    {
      category: 'SACRIFICIAL_ALTAR',
      weight: 1,
      slots: {
        altar_offer: ['your strength', 'a memory of home', 'a bond of friendship', 'your sight for a day', 'a verse from your heart'],
        altar_payoff: ['a door opens', 'a foe falls', 'sight beyond', 'a shield of bone', 'the Stalker\'s trail'],
      },
      text: 'The altar asks {altar_offer}; in return, {altar_payoff}.',
      choices: [
        { text: 'Sacrifice what is asked', effect: 'choose_sacrifice', weight: 1 },
        { text: 'Offer gold instead', effect: 'alternative_sacrifice', weight: 1 },
        { text: 'Spurn the altar', effect: 'nothing', weight: 1 },
      ],
    },

    // ── LOST SOULS ─────────────────────────────────────────
    {
      category: 'LOST_SOULS',
      weight: 2,
      slots: {
        soul: ['a child in the dark', 'a monk who doubted', 'a mother searching', 'a soldier unshriven', 'a saint gone dim'],
        soul_bond: ['a chain of ash', 'a cage of glass', 'a thread of smoke', 'a circle of salt', 'a name scratched out'],
      },
      text: 'A {soul} is bound by {soul_bond}.',
      choices: [
        { text: 'Free the soul', effect: 'free_soul', weight: 1 },
        { text: 'Free it at a cost', effect: 'gold_or_hp_cost', weight: 1 },
        { text: 'Leave it bound', effect: 'leave_soul', weight: 1 },
      ],
    },
    {
      category: 'LOST_SOULS',
      weight: 1,
      slots: {
        soul_many: ['a choir of the trapped', 'a host of the forgotten', 'a line of the waiting', 'a crowd of the silenced', 'a flock of the lost'],
        soul_many_place: ['behind a weeping door', 'in a well of names', 'under a cracked bell', 'within a book of faces', 'at the foot of a cross'],
      },
      text: '{soul_many} wait {soul_many_place}.',
      choices: [
        { text: 'Release them all', effect: 'free_soul', weight: 1 },
        { text: 'Free one, bless the rest', effect: 'mercy_reward', weight: 1 },
        { text: 'Pass by', effect: 'leave_soul', weight: 1 },
      ],
    },

    // ── CURSED ITEM ────────────────────────────────────────
    {
      category: 'CURSED_ITEM',
      weight: 2,
      slots: {
        cursed: ['a ring that drinks light', 'a blade that thirsts', 'a book that forgets', 'a cloak of whispers', 'a gem that weeps blood'],
        curse_trade: ['power for a price', 'sight for a soul', 'strength for a year', 'speed for a name', 'luck for a prayer'],
      },
      text: 'You find {cursed}. It offers {curse_trade}.',
      choices: [
        { text: 'Take it up', effect: 'take_cursed', weight: 1 },
        { text: 'Refuse and bless it', effect: 'refuse_cursed', weight: 1 },
        { text: 'Smash it', effect: 'reveal_truth', weight: 1 },
      ],
    },

    // ── LEGENDARY WEAPONS ──────────────────────────────────
    {
      category: 'LEGENDARY_WEAPONS',
      weight: 1,
      slots: {
        weapon: ['the Sword of the Spirit', 'a spear of living flame', 'a shield of faith', 'a bow of answered prayer', 'a mace of the archangel'],
        weapon_term: ['for this floor only', 'until you fall', 'for three battles', 'until the dawn breaks', 'for one desperate hour'],
      },
      text: 'You are offered {weapon}, {weapon_term}.',
      choices: [
        { text: 'Wield it', effect: 'temp_weapon', weight: 1 },
        { text: 'Bless it and store it', effect: 'store_heal', weight: 1 },
        { text: 'Decline the gift', effect: 'nothing', weight: 1 },
      ],
    },

    // ── SCRIPTURE WALK ─────────────────────────────────────
    {
      category: 'SCRIPTURE_WALK',
      weight: 2,
      slots: {
        verse: ['"I am the way"', '"Though I walk through the valley"', '"The Lord is my light"', '"Greater is He in you"', '"Fear not, for I am with you"'],
        path: ['a road that answers', 'a stair that listens', 'a bridge of words', 'a gate of truth', 'a floor of verses'],
      },
      text: '{path} responds only to {verse}.',
      choices: [
        { text: 'Speak the verse', effect: 'verse_path', weight: 1 },
        { text: 'Speak a wrong verse', effect: 'wrong_verse', weight: 1 },
        { text: 'Walk in silence', effect: 'reveal_hidden', weight: 1 },
      ],
    },

    // ── DARK COMMUNION ─────────────────────────────────────
    {
      category: 'DARK_COMMUNION',
      weight: 1,
      slots: {
        ritual: ['a communion of ash', 'a mass of the pit', 'a rite of the reversed cross', 'a feast of the fallen', 'a baptism in black'],
        ritual_grant: ['strength beyond', 'sight of the deep', 'a voice that commands', 'a shield of hate', 'the Stalker\'s favor'],
      },
      text: 'A {ritual} offers {ritual_grant}.',
      choices: [
        { text: 'Partake for power', effect: 'dark_ritual', weight: 1 },
        { text: 'Refuse and pray', effect: 'refuse_ritual', weight: 1 },
        { text: 'Break the rite', effect: 'damage_demon', weight: 1 },
      ],
    },

    // ── PILGRIMAGE ─────────────────────────────────────────
    {
      category: 'PILGRIMAGE',
      weight: 1,
      slots: {
        pilgrim: ['seven stations of the fell', 'a walk to the sealed gate', 'a climb to the crying cross', 'a path of the fourteen wounds', 'a road to the light below'],
        pilgrim_step: ['each step costs', 'each station teaches', 'each door tests', 'each wound heals', 'each turn reveals'],
      },
      text: 'A {pilgrim} — {pilgrim_step}.',
      choices: [
        { text: 'Make the pilgrimage', effect: 'pilgrim_steps', weight: 1 },
        { text: 'Abandon it at the third station', effect: 'abandon_pilgrim', weight: 1 },
        { text: 'Pray at each station', effect: 'permanent_knowledge', weight: 1 },
      ],
    },

    // ── WITNESS ────────────────────────────────────────────
    {
      category: 'WITNESS',
      weight: 2,
      slots: {
        argument: ['"If God is good, why this pit?"', '"Your faith is a crutch"', '"The cross failed"', '"Why are you spared?"', '"Prove He hears you"'],
        witness: ['a demon of law', 'a fallen apologist', 'the Stalker\'s tongue', 'a shade of a heretic', 'a liar in priest\'s robes'],
      },
      text: '{witness} tests you: {argument}',
      choices: [
        { text: 'Answer with Scripture', effect: 'faith_argued', weight: 1 },
        { text: 'Doubt, if only a moment', effect: 'doubt_sown', weight: 1 },
        { text: 'Silence the argument', effect: 'damage_demon', weight: 1 },
      ],
    },

    // ── MARTYRDOM ──────────────────────────────────────────
    {
      category: 'MARTYRDOM',
      weight: 1,
      slots: {
        martyr: ['a captive host about to die', 'a sealed gate that needs a life', 'a plague only blood can stop', 'the Stalker\'s chain that needs a key of flesh', 'a light that dies without a flame'],
        martyr_reward: ['all souls freed', 'the floor undone', 'the pit weakened', 'the Stalker wounded', 'the seal opened'],
      },
      text: '{martyr_reward} — but only if {martyr}.',
      choices: [
        { text: 'Give yourself', effect: 'martyr_self', weight: 1 },
        { text: 'Seek another way', effect: 'third_option', weight: 1 },
        { text: 'Let it pass', effect: 'neutral', weight: 1 },
      ],
    },
  ,
{
  "category": "npc",
  "weight": 3,
  "slots": {
    "npc_role": [
      "a widow clutching a sealed letter",
      "a leper barred from the path",
      "a deserter from the host above",
      "a child guarding a broken bell",
      "a scribe with ink-stained hands",
      "a captive angel in chains",
      "a mourner dressed in ash"
    ],
    "npc_offer": [
      "presses a relic into your palm",
      "whispers a name you have heard in prayer",
      "points to a scar upon the wall",
      "offers to read your fortune in dust",
      "begs you to carry a message upward",
      "reveals a wound that will not close"
    ]
  },
  "text": "A {npc_role} blocks your path and {npc_offer}.",
  "choices": [
    {
      "text": "Hear them out",
      "effect": "reveal_truth",
      "weight": 2
    },
    {
      "text": "Give them alms",
      "effect": "mercy_reward",
      "weight": 1
    },
    {
      "text": "Pass by in silence",
      "effect": "neutral",
      "weight": 1
    }
  ]
},
{
  "category": "npc",
  "weight": 3,
  "slots": {
    "traveler_form": [
      "a blind pilgrim counting his steps",
      "a merchant of forbidden salt",
      "a penitent who scourges himself",
      "a ghost of someone you failed",
      "a ferryman with no boat",
      "a beggar crowned in thorns",
      "a soldier who lost his banner"
    ],
    "traveler_secret": [
      "knows the stair that turns back on itself",
      "has seen the Watcher in the deep",
      "carries a verse etched in bone",
      "can name the demon that hunts you",
      "heard the chorus that calls your name",
      "knows where the lost souls gather"
    ]
  },
  "text": "A {traveler_form} sits by the cold fire and {traveler_secret}.",
  "choices": [
    {
      "text": "Buy their secret",
      "effect": "permanent_knowledge",
      "weight": 2
    },
    {
      "text": "Pray for them",
      "effect": "heal_or_verse",
      "weight": 1
    },
    {
      "text": "Move on",
      "effect": "neutral",
      "weight": 1
    }
  ]
},
{
  "category": "moral",
  "weight": 4,
  "slots": {
    "moral_scene": [
      "a demon bound and weeping for release",
      "a thief who stole bread for his family",
      "a sister shielding a cursed sibling",
      "a traitor begging to undo his oath",
      "a mother who traded her son for peace",
      "a servant who lied to spare a life"
    ],
    "moral_cost": [
      "demands a verse from your heart",
      "asks a year of your remaining days",
      "requires you to kneel in the dust",
      "costs the gold you carried for the sick",
      "takes a drop of your own blood",
      "asks you to speak a hard forgiveness"
    ]
  },
  "text": "You face {moral_scene}. To act with mercy {moral_cost}.",
  "choices": [
    {
      "text": "Show mercy",
      "effect": "mercy_reward",
      "weight": 1
    },
    {
      "text": "Demand justice",
      "effect": "justice_reward",
      "weight": 1
    },
    {
      "text": "Walk away",
      "effect": "neutral",
      "weight": 1
    }
  ]
},
{
  "category": "moral",
  "weight": 4,
  "slots": {
    "moral_dilemma": [
      "two souls bound to one stone",
      "a judge who condemned the innocent",
      "a friend who denied you thrice",
      "a warrior who spared a child",
      "a liar who saved a town",
      "an elder who hid the map"
    ],
    "moral_truth": [
      "knows the verse that seals the pit",
      "has seen the path the others missed",
      "can name the floor that devours the proud",
      "carries the secret of the silent choir",
      "knows where mercy was first given"
    ]
  },
  "text": "Before you stands {moral_dilemma}, who {moral_truth}. What will you do?",
  "choices": [
    {
      "text": "Hear their confession",
      "effect": "reveal_truth",
      "weight": 2
    },
    {
      "text": "Grant them peace",
      "effect": "mercy_reward",
      "weight": 1
    },
    {
      "text": "Leave them bound",
      "effect": "neutral",
      "weight": 1
    }
  ]
},
{
  "category": "shrine",
  "weight": 2,
  "slots": {
    "shrine_deity": [
      "the Ancient of Days",
      "the Lamb who was slain",
      "the Spirit that broods on water",
      "the Angel of the Covenant",
      "the Word made flesh",
      "the Host of heaven",
      "the Breath of life"
    ],
    "shrine_sign": [
      "bleeds a single drop of wine",
      "weeps where no eye sees",
      "burns with a steady, cold flame",
      "sings a line you half-remember",
      "holds a light beneath the dark",
      "shivers at your approach"
    ]
  },
  "text": "An altar to {shrine_deity} stands in the gloom and {shrine_sign}.",
  "choices": [
    {
      "text": "Kneel and pray",
      "effect": "heal_or_verse",
      "weight": 2
    },
    {
      "text": "Offer what you carry",
      "effect": "buff_for_gold",
      "weight": 1
    },
    {
      "text": "Read the inscription",
      "effect": "reveal_map",
      "weight": 1
    }
  ]
},
{
  "category": "shrine",
  "weight": 2,
  "slots": {
    "shrine_object": [
      "a basin of still water",
      "a pillar marked with seven names",
      "a brazier of unburnt coal",
      "a door with no hinges",
      "a tree that bears no fruit",
      "a lamp that casts no shadow",
      "a stone that drinks the light"
    ],
    "shrine_action": [
      "reveals your reflection as a stranger",
      "shows the road you refused",
      "hums the song of the redeemed",
      "opens onto a room not there",
      "lists the sins already counted",
      "promises what the pit cannot"
    ]
  },
  "text": "You come upon {shrine_object}. It {shrine_action}.",
  "choices": [
    {
      "text": "Draw near in faith",
      "effect": "full_heal_small",
      "weight": 2
    },
    {
      "text": "Study its meaning",
      "effect": "permanent_knowledge",
      "weight": 1
    },
    {
      "text": "Turn away",
      "effect": "neutral",
      "weight": 1
    }
  ]
},
{
  "category": "lore",
  "weight": 2,
  "slots": {
    "lore_subject": [
      "the war that split the morning stars",
      "why the seraph hid his face",
      "the name the Father keeps secret",
      "how the first gate was sealed",
      "what the dragon lost at the flood",
      "the silence between two thunderous psalms",
      "where the light was kept before time"
    ],
    "lore_vision": [
      "unfolds as a city of glass",
      "appears as a throne grown dim",
      "shows a garden before the fall",
      "reveals a book with seven seals",
      "opens a window onto the void",
      "sings the song no demon knows"
    ]
  },
  "text": "In the dark, {lore_subject} {lore_vision} before your eyes.",
  "choices": [
    {
      "text": "Watch and remember",
      "effect": "permanent_knowledge",
      "weight": 2
    },
    {
      "text": "Recite it as prayer",
      "effect": "buff_wisdom",
      "weight": 1
    },
    {
      "text": "Shut your eyes",
      "effect": "neutral",
      "weight": 1
    }
  ]
},
{
  "category": "lore",
  "weight": 2,
  "slots": {
    "lore_relic": [
      "a feather from a fallen watcher",
      "the coin paid for a life",
      "a thorn from the cursed crown",
      "the nail that held the morning",
      "a page torn from the lost book",
      "the rope that bound a prophet",
      "a scale from the sealed beast"
    ],
    "lore_truth": [
      "tells of the mercy that outlasted wrath",
      "names the demon that fled the cross",
      "shows the verse that unmade the pit",
      "reveals the floor where angels fell",
      "whispers the name that silences the deep",
      "uncovers the path the proud cannot walk"
    ]
  },
  "text": "A {lore_relic} lies in the ash and {lore_truth}.",
  "choices": [
    {
      "text": "Take it and learn",
      "effect": "learn_verse",
      "weight": 2
    },
    {
      "text": "Bury it in peace",
      "effect": "mercy_reward",
      "weight": 1
    },
    {
      "text": "Leave it to rot",
      "effect": "neutral",
      "weight": 1
    }
  ]
},
{
  "category": "negotiate",
  "weight": 3,
  "slots": {
    "negotiator": [
      "a trader with eyes of coin",
      "a demon wearing a merchant's smile",
      "a go-between of ash and silk",
      "a broker of souls and small favors",
      "a haggler who speaks in parables",
      "a peddler of borrowed light",
      "a bargainer with a ledger of names"
    ],
    "negotiator_offer": [
      "offers safe passage for a verse",
      "will sell the map for your blood",
      "trades power for a year of mercy",
      "gives silence in exchange for a secret",
      "offers to hide you from the Stalker",
      "sells the weakness of the pit"
    ]
  },
  "text": "A {negotiator} blocks the stair and {negotiator_offer}.",
  "choices": [
    {
      "text": "Hear the terms",
      "effect": "reveal_weakness",
      "weight": 2
    },
    {
      "text": "Pay the price",
      "effect": "deal_with_demon",
      "weight": 1
    },
    {
      "text": "Refuse and pass",
      "effect": "neutral",
      "weight": 1
    }
  ]
},
{
  "category": "negotiate",
  "weight": 3,
  "slots": {
    "diplomat": [
      "a herald of the lower court",
      "a serpent-tongued emissary",
      "a courier from the silent floors",
      "a representative of the pit's order",
      "a voice that speaks for the bound",
      "a steward of the forgotten oaths",
      "a mediator between two devils"
    ],
    "diplomat_proposal": [
      "proposes a truce until the next gate",
      "offers to name your enemy for a price",
      "will spare a soul if you kneel",
      "proposes you carry a message downward",
      "offers knowledge of the trap ahead",
      "suggests you trade your fear for their favor"
    ]
  },
  "text": "A {diplomat} approaches and {diplomat_proposal}.",
  "choices": [
    {
      "text": "Trade for the knowledge",
      "effect": "permanent_knowledge",
      "weight": 2
    },
    {
      "text": "Accept the truce",
      "effect": "deal_with_demon",
      "weight": 1
    },
    {
      "text": "Denounce them",
      "effect": "damage_demon",
      "weight": 1
    }
  ]
},
{
  "category": "forsaken",
  "weight": 2,
  "slots": {
    "forsaken_thing": [
      "a chapel with its bell torn down",
      "a village that worshipped the wrong name",
      "a garden where the fruit turned to ash",
      "a well that swallowed its own water",
      "a tower abandoned by its builder",
      "a congregation that sang itself to sleep",
      "a field where the harvest refused to rise"
    ],
    "forsaken_sign": [
      "still smells of extinguished incense",
      "echoes with a prayer no one answers",
      "bears the mark of a withdrawn hand",
      "holds the shape of a door long closed",
      "whispers the names of the forgotten",
      "shows where the light once fell"
    ]
  },
  "text": "You enter {forsaken_thing}. It {forsaken_sign}.",
  "choices": [
    {
      "text": "Pray over the ruin",
      "effect": "heal_or_verse",
      "weight": 2
    },
    {
      "text": "Search the remnants",
      "effect": "reveal_secret",
      "weight": 1
    },
    {
      "text": "Flee the emptiness",
      "effect": "nothing",
      "weight": 1
    }
  ]
},
{
  "category": "forsaken",
  "weight": 2,
  "slots": {
    "forsaken_soul": [
      "a believer who cursed the day he hoped",
      "a saint who doubted at the last",
      "a mother who outlived her prayers",
      "a watcher who fell for love of the earth",
      "a martyr who wondered if it was worth it",
      "a priest who buried his own faith",
      "a child who was promised and forgotten"
    ],
    "forsaken_lament": [
      "sings a hymn with no ending",
      "asks why the heavens stayed shut",
      "offers you the bitterness he kept",
      "shows you the letter never answered",
      "whispers the verse he could not finish",
      "reveals the wound that doubt opened"
    ]
  },
  "text": "A {forsaken_soul} waits in the dark and {forsaken_lament}.",
  "choices": [
    {
      "text": "Speak the missing verse",
      "effect": "heal_sick",
      "weight": 2
    },
    {
      "text": "Listen to their grief",
      "effect": "reveal_truth",
      "weight": 1
    },
    {
      "text": "Leave them in the dark",
      "effect": "nothing",
      "weight": 1
    }
  ]
},
{
  "category": "TEMPTATION_OF_CHRIST",
  "weight": 3,
  "slots": {
    "toc_temptation": [
      "bread from stones at your feet",
      "the kingdoms of the world in a single glance",
      "the power to cast yourself down unharmed",
      "a throne built on the backs of the fallen",
      "a shortcut that bypasses the cross",
      "a crown offered without the suffering",
      "a feast in a desert of bones"
    ],
    "toc_voice": [
      "quotes Scripture to your thirst",
      "promises what the Father withheld",
      "asks why you should hunger",
      "offers the end without the means",
      "whispers that the angels will catch you",
      "says the nations are already yours"
    ]
  },
  "text": "The Tempter shows you {toc_temptation}. He {toc_voice}.",
  "choices": [
    {
      "text": "Answer with Scripture",
      "effect": "counter_praise",
      "weight": 2
    },
    {
      "text": "Take the bait",
      "effect": "gold_or_hp_cost",
      "weight": 1
    },
    {
      "text": "Flee to prayer",
      "effect": "buff_wisdom",
      "weight": 1
    }
  ]
},
{
  "category": "TEMPTATION_OF_CHRIST",
  "weight": 3,
  "slots": {
    "toc_second": [
      "a pinnacle above the screaming deep",
      "a mountain where all nations bow",
      "a wilderness of forty empty days",
      "a vision of an easy glory",
      "a mirror that shows you as king",
      "a path of stones that become bread",
      "a hollow where angels should have come"
    ],
    "toc_promise": [
      "promises the nations will serve you",
      "says the Father would not let you fall",
      "offers to end the hunger now",
      "shows the crown without the nails",
      "swears the desert need not last",
      "pledges the angels as your guard"
    ]
  },
  "text": "Upon {toc_second}, the Tempter {toc_promise}.",
  "choices": [
    {
      "text": "Rebuke him",
      "effect": "counter_praise",
      "weight": 2
    },
    {
      "text": "Accept the glory",
      "effect": "sacrifice_power",
      "weight": 1
    },
    {
      "text": "Worship in Spirit",
      "effect": "buff_wisdom",
      "weight": 1
    }
  ]
},
{
  "category": "DEMON_NATURE",
  "weight": 3,
  "slots": {
    "demon_kind": [
      "a legioned shadow of many voices",
      "a devourer shaped like a friend",
      "a liar wearing the face of an angel",
      "an accuser that counts your sins aloud",
      "a seducer robed in borrowed light",
      "a writhing thing of unnumbered names",
      "a beast that feeds on forgotten prayers"
    ],
    "demon_nature": [
      "confesses it was once a singer of the height",
      "admits it fears the name it cannot speak",
      "reveals it was cast out for pride",
      "shows the wound the cross left on it",
      "confesses it envies the least of the saved",
      "admits it cannot enter where love abides"
    ]
  },
  "text": "A {demon_kind} speaks and {demon_nature}.",
  "choices": [
    {
      "text": "Learn its weakness",
      "effect": "reveal_weakness",
      "weight": 2
    },
    {
      "text": "Bind it with a verse",
      "effect": "damage_demon",
      "weight": 1
    },
    {
      "text": "Walk past it",
      "effect": "nothing",
      "weight": 1
    }
  ]
},
{
  "category": "DEMON_NATURE",
  "weight": 3,
  "slots": {
    "demon_form2": [
      "a swarm that takes the shape of doubt",
      "a pale imitation of a seraph",
      "a thing that wears the skin of mercy",
      "a whisperer in the language of grief",
      "a mockery of the form you pray to",
      "a cold fire that pretends to warm",
      "a chorus of one, pretending to be many"
    ],
    "demon_reveal": [
      "drops the mask for a single breath",
      "shows the hollow where its heart was",
      "uncovers the chain it hides behind pride",
      "reveals it was once given a name of light",
      "exposes the fear beneath its hunger",
      "shows the seal that still marks its brow"
    ]
  },
  "text": "The {demon_form2} turns and {demon_reveal}.",
  "choices": [
    {
      "text": "Mark what you see",
      "effect": "permanent_knowledge",
      "weight": 2
    },
    {
      "text": "Strike the true form",
      "effect": "damage_demon",
      "weight": 1
    },
    {
      "text": "Pity the creature",
      "effect": "mercy_reward",
      "weight": 1
    }
  ]
},
{
  "category": "MORAL_AMBIGUOUS",
  "weight": 4,
  "slots": {
    "amb_decision": [
      "spare the demon who begs",
      "burn the scroll that warns you",
      "free the soul that asks to stay",
      "take the gold from the undeserving",
      "break the oath to save a life",
      "lie to the pit about your name",
      "give the verse to one who will misuse it"
    ],
    "amb_outcome": [
      "may damn another or save you",
      "could free a prisoner or a fiend",
      "might heal a foe or arm him",
      "will wound the innocent or the guilty",
      "can open the gate or seal it",
      "may trade a life for a life"
    ]
  },
  "text": "You must {amb_decision}. The act {amb_outcome}.",
  "choices": [
    {
      "text": "Choose mercy",
      "effect": "mercy_reward",
      "weight": 1
    },
    {
      "text": "Choose survival",
      "effect": "gold_or_hp_cost",
      "weight": 1
    },
    {
      "text": "Seek the right path",
      "effect": "reveal_truth",
      "weight": 1
    }
  ]
},
{
  "category": "MORAL_AMBIGUOUS",
  "weight": 4,
  "slots": {
    "amb_scene2": [
      "a scale with no true balance",
      "a door that opens for a lie",
      "a well that trades memory for water",
      "a bargain written in shifting ink",
      "a light that grows by what it consumes",
      "a road that shortens only by a sin",
      "a mercy that costs another their soul"
    ],
    "amb_choice2": [
      "promises peace at the price of truth",
      "offers power that forgets the weak",
      "grants safety by betraying a friend",
      "gives sight that blinds the spirit",
      "buys time with a stranger's blood",
      "saves you by dooming the nameless"
    ]
  },
  "text": "Before you is {amb_scene2}, which {amb_choice2}.",
  "choices": [
    {
      "text": "Take the lesser evil",
      "effect": "both_cost",
      "weight": 1
    },
    {
      "text": "Refuse the bargain",
      "effect": "neutral",
      "weight": 1
    },
    {
      "text": "Pray for wisdom",
      "effect": "wisdom_reveal",
      "weight": 1
    }
  ]
},
{
  "category": "HIDDEN_ROOM",
  "weight": 2,
  "slots": {
    "hidden_room": [
      "a chamber behind the weeping wall",
      "a hollow beneath the broken stair",
      "a vault sealed with a forgotten name",
      "a niche where the air stands still",
      "a passage that opens only in shadow",
      "a room that the map never drew",
      "a crypt folded into the rock"
    ],
    "hidden_find": [
      "holds a relic the pit forgot",
      "contains a verse none have spoken",
      "keeps the bones of an unrecorded saint",
      "hides the key to a deeper floor",
      "wears the dust of a thousand years",
      "guards a light the dark could not eat"
    ]
  },
  "text": "You find {hidden_room}. It {hidden_find}.",
  "choices": [
    {
      "text": "Enter and search",
      "effect": "reveal_hidden",
      "weight": 2
    },
    {
      "text": "Seal it shut",
      "effect": "seal_opening",
      "weight": 1
    },
    {
      "text": "Take only what you need",
      "effect": "random_item",
      "weight": 1
    }
  ]
},
{
  "category": "CURSED_ITEM",
  "weight": 2,
  "slots": {
    "cursed_item": [
      "a ring that hums with borrowed years",
      "a blade that drinks the wielder's name",
      "a book that rewrites the reader",
      "a crown that weighs the soul it sits on",
      "a charm that trades luck for memory",
      "a mirror that pays in reflected sins",
      "a coin that buys what it has already taken"
    ],
    "cursed_mark": [
      "bears the sigil of a fallen house",
      "weeps a slow, black dew",
      "whispers the name you fear to hear",
      "glows with a light that cools the blood",
      "bears the scratch of a denied command",
      "pulses like a second, wicked heart"
    ]
  },
  "text": "You uncover {cursed_item}. It {cursed_mark}.",
  "choices": [
    {
      "text": "Take it despite the warning",
      "effect": "take_cursed",
      "weight": 2
    },
    {
      "text": "Refuse and bless it",
      "effect": "refuse_cursed",
      "weight": 1
    },
    {
      "text": "Walk away",
      "effect": "neutral",
      "weight": 1
    }
  ]
},
{
  "category": "PILGRIMAGE",
  "weight": 2,
  "slots": {
    "pilgrimage_road": [
      "a road that climbs toward no sun",
      "a riverbed where the water walked once",
      "a stair cut into the living rock",
      "a bridge of verses over the abyss",
      "a path lined with the stones of the fallen",
      "a trail that ascends through weeping trees",
      "a way marked by the footprints of the faithful"
    ],
    "pilgrimage_sign": [
      "narrows with every step you take",
      "brightens where the lost have prayed",
      "tests you with each remembered sin",
      "opens onto a vista none return from",
      "hardens beneath the weight of doubt",
      "sings low where the righteous rested"
    ]
  },
  "text": "You walk {pilgrimage_road}. It {pilgrimage_sign}.",
  "choices": [
    {
      "text": "Press onward",
      "effect": "pilgrim_steps",
      "weight": 2
    },
    {
      "text": "Rest and read",
      "effect": "learn_verse",
      "weight": 1
    },
    {
      "text": "Turn back down",
      "effect": "neutral",
      "weight": 1
    }
  ]
},
{
  "category": "trap",
  "weight": 3,
  "slots": {
    "trap_kind": [
      "a floor of needle-bone",
      "a gorge of falling ash",
      "a ceiling of hanging hooks",
      "a pool of black oil",
      "a gallery of mirrored eyes",
      "a stair that melts as you climb"
    ],
    "trap_oath": [
      "opens when you speak your name",
      "springs when you look back",
      "binds when you doubt",
      "ignites when you try to flee",
      "sings when you are alone"
    ]
  },
  "text": "You step into {trap_kind} that {trap_oath}. The air is thick with the smell of old iron and something worse.",
  "choices": [
    {
      "text": "Trace it slowly",
      "effect": "skill_check",
      "weight": 2
    },
    {
      "text": "Leap across blindly",
      "effect": "hp_cost_random",
      "weight": 1
    },
    {
      "text": "Search for the hinge",
      "effect": "reveal_hidden",
      "weight": 1
    }
  ]
},
{
  "category": "trap",
  "weight": 2,
  "slots": {
    "trap_ward": [
      "a row of finger-bones",
      "a ring of salt gone black",
      "a noose of cold light",
      "a wall that breathes inward",
      "a pit masked by song",
      "a door of closing teeth"
    ],
    "trap_price": [
      "demands a verse to pass",
      "claims a memory for safe crossing",
      "takes blood before it opens",
      "asks your true name aloud",
      "wants a prayer you do not know"
    ]
  },
  "text": "{trap_ward} bars the hall and {trap_price}. Something behind it waits, patient as famine and twice as old.",
  "choices": [
    {
      "text": "Pay in blood",
      "effect": "hp_cost_random",
      "weight": 2
    },
    {
      "text": "Refuse and turn back",
      "effect": "nothing",
      "weight": 1
    },
    {
      "text": "Find the safe path",
      "effect": "reveal_hidden",
      "weight": 1
    }
  ]
},
{
  "category": "puzzle",
  "weight": 3,
  "slots": {
    "puzzle_form": [
      "a door of seven silent mouths",
      "a bridge built from lies",
      "a stair that counts your sins",
      "a wall of weeping stone",
      "a circle that turns only for truth",
      "a gate of unspoken names"
    ],
    "puzzle_key": [
      "a verse of mercy",
      "the name of the lost",
      "a word spoken backward",
      "the first commandment",
      "a psalm you half-remember"
    ]
  },
  "text": "Before you stands {puzzle_form}. It will open only for {puzzle_key}, and the dark is listening to your answer.",
  "choices": [
    {
      "text": "Speak the verse",
      "effect": "answer_riddle",
      "weight": 2
    },
    {
      "text": "Force the lock",
      "effect": "hp_cost_random",
      "weight": 1
    },
    {
      "text": "Read the carving",
      "effect": "permanent_knowledge",
      "weight": 1
    }
  ]
},
{
  "category": "puzzle",
  "weight": 2,
  "slots": {
    "puzzle_riddle": [
      "a knot of living shadow",
      "a scale that weighs the soul",
      "a mirror that shows your end",
      "a lock of interlocking prayers",
      "a map drawn in ash",
      "a bell that rings when lied to"
    ],
    "puzzle_clue": [
      "carved beneath your feet",
      "whispered by the wind",
      "written in a dead tongue",
      "shown in falling light",
      "hummed by something near"
    ]
  },
  "text": "You face {puzzle_riddle}. The answer lies in {puzzle_clue}, if your wisdom is equal to your fear.",
  "choices": [
    {
      "text": "Solve with Scripture",
      "effect": "answer_riddle",
      "weight": 2
    },
    {
      "text": "Break it open",
      "effect": "learn_verse_or_trap",
      "weight": 1
    },
    {
      "text": "Walk away in peace",
      "effect": "neutral",
      "weight": 1
    }
  ]
},
{
  "category": "scroll",
  "weight": 3,
  "slots": {
    "scroll_face": [
      "a scroll of weathered skin",
      "a page that glows dim blue",
      "a parchment soaked in wine",
      "a leaf of beaten gold",
      "a strip of shadow given form",
      "a letter in your own hand"
    ],
    "scroll_truth": [
      "a verse you had forgotten",
      "the name of your stalker",
      "a warning about the next tier",
      "a prayer of the first martyr",
      "a map of the floors below"
    ]
  },
  "text": "A {scroll_face} rests on the altar. {scroll_truth} crawls across it slowly as you watch, unwilling to be read.",
  "choices": [
    {
      "text": "Read it aloud",
      "effect": "learn_verse",
      "weight": 2
    },
    {
      "text": "Memorize in silence",
      "effect": "permanent_knowledge",
      "weight": 1
    },
    {
      "text": "Burn it unread",
      "effect": "fire_damage_or_wisdom",
      "weight": 1
    }
  ]
},
{
  "category": "scroll",
  "weight": 2,
  "slots": {
    "scroll_seal": [
      "a seal of wax and ash",
      "a lock of braided hair",
      "a clasp of black iron",
      "a knot of thorn and thread",
      "a sigil that burns to touch",
      "a ribbon bound by a vow"
    ],
    "scroll_gift": [
      "a fragment of a lost gospel",
      "the location of a hidden spring",
      "a demon's true weakness",
      "a verse of protection",
      "the hour of your testing"
    ]
  },
  "text": "You uncover {scroll_seal} hiding {scroll_gift}. The ink shifts whenever you are not looking directly at it.",
  "choices": [
    {
      "text": "Break the seal",
      "effect": "reveal_secret",
      "weight": 2
    },
    {
      "text": "Study the cipher",
      "effect": "permanent_knowledge",
      "weight": 1
    },
    {
      "text": "Leave it sealed",
      "effect": "nothing",
      "weight": 1
    }
  ]
},
{
  "category": "ambush",
  "weight": 3,
  "slots": {
    "ambush_foe": [
      "a clutch of blade-winged imps",
      "a demon of poured tar",
      "a pack of tongue-less hounds",
      "a hunter made of mirrors",
      "a chorus of screaming mouths",
      "a thing wearing a saint's face"
    ],
    "ambush_ground": [
      "drops from the rafters",
      "rises from the flooded floor",
      "steps from a painted wall",
      "unfolds out of the dark",
      "crawls through the stone"
    ]
  },
  "text": "{ambush_foe} {ambush_ground} before you can pray. There is no time left to choose your ground.",
  "choices": [
    {
      "text": "Stand and fight",
      "effect": "combat_start",
      "weight": 2
    },
    {
      "text": "Flee the room",
      "effect": "flee_or_damage",
      "weight": 1
    },
    {
      "text": "Read its weakness",
      "effect": "reveal_weakness",
      "weight": 1
    }
  ]
},
{
  "category": "ambush",
  "weight": 2,
  "slots": {
    "ambush_trap": [
      "a snare of singing wire",
      "a false floor of glass",
      "a wall that collapses inward",
      "a flood released from above",
      "a net of grasping shadow",
      "a ceiling of falling teeth"
    ],
    "ambush_voice": [
      "laughs from the rafters",
      "whispers your sins",
      "counts your heartbeats",
      "mimics a loved voice",
      "sings a hymn gone wrong"
    ]
  },
  "text": "As you move, {ambush_trap} springs and {ambush_voice}. This ambush was built for you alone, and no one else.",
  "choices": [
    {
      "text": "Cut through it",
      "effect": "combat_bonus",
      "weight": 2
    },
    {
      "text": "Take the hit, keep moving",
      "effect": "hp_cost_random",
      "weight": 1
    },
    {
      "text": "Spot the trigger",
      "effect": "skill_check",
      "weight": 1
    }
  ]
},
{
  "category": "sacrifice",
  "weight": 3,
  "slots": {
    "sacrifice_altar": [
      "an altar of cold bone",
      "a pit crowned with candle-flame",
      "a stone that drinks light",
      "a throne of knotted roots",
      "a fountain of still blood",
      "a pyre that will not die"
    ],
    "sacrifice_demand": [
      "your strongest memory of home",
      "a year of your life",
      "the name you were given",
      "a verse written on your heart",
      "the warmth of your own hands"
    ]
  },
  "text": "At {sacrifice_altar} a voice asks {sacrifice_demand} in exchange for the power to go on.",
  "choices": [
    {
      "text": "Give what is asked",
      "effect": "sacrifice_power",
      "weight": 2
    },
    {
      "text": "Offer something lesser",
      "effect": "alternative_sacrifice",
      "weight": 1
    },
    {
      "text": "Refuse the altar",
      "effect": "nothing",
      "weight": 1
    }
  ]
},
{
  "category": "sacrifice",
  "weight": 2,
  "slots": {
    "sacrifice_cost": [
      "a cut across the palm",
      "a prayer you will never speak again",
      "a drop of your own blood",
      "the weight of a secret sin",
      "a breath you cannot take back",
      "a tear you did not know you had"
    ],
    "sacrifice_boon": [
      "sight beyond the next veil",
      "strength to break the door",
      "courage that does not fail",
      "a word that wounds demons",
      "peace that hides your fear"
    ]
  },
  "text": "The angel of the threshold requires {sacrifice_cost} for {sacrifice_boon}. The price is written in ash.",
  "choices": [
    {
      "text": "Pay the price",
      "effect": "choose_sacrifice",
      "weight": 2
    },
    {
      "text": "Bargain for less",
      "effect": "both_cost",
      "weight": 1
    },
    {
      "text": "Walk past unworthy",
      "effect": "neutral",
      "weight": 1
    }
  ]
},
{
  "category": "vision",
  "weight": 3,
  "slots": {
    "vision_scene": [
      "a city where no bell rings",
      "a field of unburied bones",
      "a throne emptied of its king",
      "a sea that burns but does not consume",
      "a garden where the fruit is eyes",
      "a road that ends in silence"
    ],
    "vision_meaning": [
      "the fall that is still coming",
      "the mercy that waits below",
      "the name you must not speak",
      "the hour your faith is tested",
      "the face you will become"
    ]
  },
  "text": "Sleep takes you, and you see {vision_scene}. In it, {vision_meaning} is shown to you without comfort or mercy.",
  "choices": [
    {
      "text": "Wake and remember",
      "effect": "prophetic_vision",
      "weight": 2
    },
    {
      "text": "Seek its meaning",
      "effect": "reveal_truth",
      "weight": 1
    },
    {
      "text": "Forget it quickly",
      "effect": "nothing",
      "weight": 1
    }
  ]
},
{
  "category": "vision",
  "weight": 2,
  "slots": {
    "vision_angel": [
      "a seraph with six folded wings",
      "a messenger robed in storm",
      "a watcher with eyes of coin",
      "a herald bearing no name",
      "a light that will not shape itself",
      "a voice without a body"
    ],
    "vision_word": [
      "a command to descend further",
      "a warning against pride",
      "the location of the next seal",
      "a verse to keep close",
      "a promise that the end is near"
    ]
  },
  "text": "{vision_angel} meets you in the dark and speaks {vision_word}. You are changed whether you believe it or not.",
  "choices": [
    {
      "text": "Receive the word",
      "effect": "angel_truth",
      "weight": 2
    },
    {
      "text": "Question the vision",
      "effect": "permanent_knowledge",
      "weight": 1
    },
    {
      "text": "Refuse to listen",
      "effect": "doubt_sown",
      "weight": 1
    }
  ]
},
{
  "category": "PARABLES",
  "weight": 3,
  "slots": {
    "parable_scene": [
      "a traveler left for dead by the road",
      "a younger son who demands his share",
      "a shepherd who leaves the ninety-nine",
      "a servant given ten coins",
      "a sower casting on stone",
      "a feast where the poor are sent for"
    ],
    "parable_lesson": [
      "mercy shown to an enemy",
      "a welcome for the wasted",
      "one soul worth the long search",
      "a gift that grows by giving",
      "truth that falls on ready ground"
    ]
  },
  "text": "The falls show you {parable_scene}, and the lesson is {parable_lesson}. Will you live it, or merely watch?",
  "choices": [
    {
      "text": "Live the parable",
      "effect": "good_samaritan",
      "weight": 2
    },
    {
      "text": "Learn from it",
      "effect": "learn_verse",
      "weight": 1
    },
    {
      "text": "Pass by unmoved",
      "effect": "neutral",
      "weight": 1
    }
  ]
},
{
  "category": "PARABLES",
  "weight": 2,
  "slots": {
    "parable_coin": [
      "a single coin of forgotten mint",
      "a loaf that does not shrink",
      "a seed that sprouts in stone",
      "a ring of returned inheritance",
      "a sheep's bell in the dark",
      "a net full beyond its seams"
    ],
    "parable_offer": [
      "given to the one who lost all",
      "multiplied among the hungry",
      "planted where nothing grew",
      "restored to the one who wandered",
      "shared until all are fed"
    ]
  },
  "text": "You are offered {parable_coin}, and told it is {parable_offer}. The giver watches closely how you receive.",
  "choices": [
    {
      "text": "Give it away",
      "effect": "multiply_loaves",
      "weight": 2
    },
    {
      "text": "Study the lesson",
      "effect": "learn_verse",
      "weight": 1
    },
    {
      "text": "Keep it for yourself",
      "effect": "talents",
      "weight": 1
    }
  ]
},
{
  "category": "COMBAT_VARIANTS",
  "weight": 3,
  "slots": {
    "combat_foe": [
      "a brute wrapped in chains",
      "a singer who wounds with sound",
      "a thing of uncoiling rope",
      "a knight of fallen orders",
      "a swarm that thinks as one",
      "a mirror that fights as you do"
    ],
    "combat_edge": [
      "the high ground of broken stairs",
      "cover behind a fallen pillar",
      "the dark it cannot enter",
      "a verse that slows its hand",
      "a choke where numbers fail"
    ]
  },
  "text": "You meet {combat_foe} and {combat_edge} may decide who leaves this room alive when the singing stops.",
  "choices": [
    {
      "text": "Press the advantage",
      "effect": "combat_bonus",
      "weight": 2
    },
    {
      "text": "Trade blow for blow",
      "effect": "aoe_or_damage",
      "weight": 1
    },
    {
      "text": "Call on a verse",
      "effect": "combat_condition",
      "weight": 1
    }
  ]
},
{
  "category": "COMBAT_VARIANTS",
  "weight": 2,
  "slots": {
    "combat_wager": [
      "your remaining strength",
      "a held breath of prayer",
      "the last of your gold",
      "a stance you cannot hold long",
      "a name you speak to wound"
    ],
    "combat_stakes": [
      "the demon's binding word",
      "a second foe from the dark",
      "the door that will not open twice",
      "a wound that will not close",
      "the silence after the scream"
    ]
  },
  "text": "The fight turns on {combat_wager}, with {combat_stakes} hanging in the balance between you and the dark.",
  "choices": [
    {
      "text": "Risk it all",
      "effect": "multi_combat",
      "weight": 2
    },
    {
      "text": "Fight defensively",
      "effect": "buff_defense",
      "weight": 1
    },
    {
      "text": "Strike for the kill",
      "effect": "damage_demon",
      "weight": 1
    }
  ]
},
{
  "category": "TRADER_DEMONS",
  "weight": 3,
  "slots": {
    "trader_wares": [
      "a jar of stolen light",
      "a map drawn in another's blood",
      "a coin that buys an hour",
      "a vial of borrowed courage",
      "a feather from a dead angel",
      "a key to a room not yet built"
    ],
    "trader_pitch": [
      "prices it in your memories",
      "asks a verse you love",
      "wants your shadow as downpayment",
      "demands a name you trust",
      "takes a year you have not lived"
    ]
  },
  "text": "A trader-demon shows {trader_wares} and {trader_pitch}. Its smile is older than your faith and colder.",
  "choices": [
    {
      "text": "Buy with what's asked",
      "effect": "demon_trade",
      "weight": 2
    },
    {
      "text": "Haggle for the price",
      "effect": "deal_with_demon",
      "weight": 1
    },
    {
      "text": "Walk away clean",
      "effect": "refuse_cursed",
      "weight": 1
    }
  ]
},
{
  "category": "TRADER_DEMONS",
  "weight": 2,
  "slots": {
    "trader_game": [
      "a game of thrown bones",
      "a wager on the next breath",
      "a roll that names your sin",
      "a toss for a forgotten face",
      "a dice of burning ivory",
      "a bet settled in blood"
    ],
    "trader_stake": [
      "your gold against its secret",
      "your silence for its blade",
      "a verse for a way past",
      "your name for safe passage",
      "a memory for a weapon"
    ]
  },
  "text": "The trader-demon proposes {trader_game}, staking {trader_stake}. The dice are loaded, but you might still win.",
  "choices": [
    {
      "text": "Throw the dice",
      "effect": "dice_demon",
      "weight": 2
    },
    {
      "text": "Bet your gold",
      "effect": "bet_gold",
      "weight": 1
    },
    {
      "text": "Refuse the game",
      "effect": "nothing",
      "weight": 1
    }
  ]
},
{
  "category": "RIDDLE",
  "weight": 3,
  "slots": {
    "riddle_keeper": [
      "a sphinx of crumbling clay",
      "a child who quotes the dead",
      "a door that speaks in riddles",
      "a star that fell and reasons",
      "a skull that laughs in meter",
      "a river that asks your name"
    ],
    "riddle_tongue": [
      "in a language of teeth",
      "as a verse read backward",
      "through a mouth of smoke",
      "in the cadence of a psalm",
      "with words that change meaning"
    ]
  },
  "text": "{riddle_keeper} poses its question {riddle_tongue}. Answer wrong, and the floor forgets you were ever here.",
  "choices": [
    {
      "text": "Answer with Scripture",
      "effect": "answer_riddle",
      "weight": 2
    },
    {
      "text": "Seek the hidden sense",
      "effect": "reveal_truth",
      "weight": 1
    },
    {
      "text": "Silence the keeper",
      "effect": "damage_demon",
      "weight": 1
    }
  ]
},
{
  "category": "LEGENDARY_WEAPONS",
  "weight": 3,
  "slots": {
    "weapon_form": [
      "a sword forged from a psalm",
      "a spear that drank the sea",
      "a bow strung with a martyr's hair",
      "a blade of quenched lightning",
      "a mace of the seventh seal",
      "a dagger earned in the flood"
    ],
    "weapon_curse": [
      "binds to the hand that takes it",
      "hungers for a verse each dawn",
      "remembers every soul it cuts",
      "demands a name to be its edge",
      "grows cold when you doubt"
    ]
  },
  "text": "You find {weapon_form}. The legend says it {weapon_curse}, and not all who held it walked on afterward.",
  "choices": [
    {
      "text": "Take up the weapon",
      "effect": "temp_weapon",
      "weight": 2
    },
    {
      "text": "Bless it first",
      "effect": "safe_item",
      "weight": 1
    },
    {
      "text": "Leave it to rust",
      "effect": "refuse_cursed",
      "weight": 1
    }
  ]
},
{
  "category": "WITNESS",
  "weight": 3,
  "slots": {
    "witness_who": [
      "a martyr who died singing",
      "a child who saw the heavens open",
      "a thief who repented at the end",
      "a widow who fed the stranger",
      "a soldier who dropped his spear",
      "a scribe who burned his scrolls"
    ],
    "witness_testimony": [
      "names the demon by its true name",
      "shows the way the seal was broken",
      "tells where the light was lost",
      "reveals who betrayed the gate",
      "speaks the verse that holds the dark"
    ]
  },
  "text": "{witness_who} appears and {witness_testimony}. The testimony cannot be unheard once it has been given.",
  "choices": [
    {
      "text": "Hear the testimony",
      "effect": "reveal_truth",
      "weight": 2
    },
    {
      "text": "Learn the verse",
      "effect": "learn_verse",
      "weight": 1
    },
    {
      "text": "Send the witness away",
      "effect": "leave_soul",
      "weight": 1
    }
  ]
},
{
  "category": "temptation",
  "weight": 3,
  "slots": {
    "temptation": [
      "a serpent coiled around a golden fruit",
      "a whisper promising you will be like God",
      "a mirror where you look younger and kinder",
      "a garden blooming in the dark",
      "a throne shaped to your shoulders",
      "a voice that names you a prophet",
      "a cup that never empties"
    ],
    "temptation_pull": [
      "coils closer",
      "hisses a blessing",
      "promises the crown",
      "offers the fruit",
      "sings your name",
      "shows you a softer road"
    ]
  },
  "text": "You meet {temptation}. It {temptation_pull}, and the air goes sweet with lies.",
  "choices": [
    {
      "text": "Resist in silence",
      "effect": "buff_wisdom",
      "weight": 1
    },
    {
      "text": "Take what is offered",
      "effect": "gold_or_hp_cost",
      "weight": 2
    },
    {
      "text": "Crush it and learn",
      "effect": "reveal_truth",
      "weight": 1
    }
  ]
},
{
  "category": "temptation",
  "weight": 3,
  "slots": {
    "temptation": [
      "a contract written in your own blood",
      "a doorway only the proud may open",
      "a scale promising to weigh your soul as light",
      "a coin that buys forgiveness",
      "a name you could take to command demons",
      "a shorter path lit by a false dawn"
    ],
    "temptation_cost": [
      "demands a year of your life",
      "asks for a verse you love",
      "requires you deny one mercy",
      "wants your truest name",
      "takes a memory of home",
      "costs the fear of the Lord"
    ]
  },
  "text": "A {temptation} appears. It {temptation_cost} and the easy road opens wide.",
  "choices": [
    {
      "text": "Walk the easy road",
      "effect": "gold_or_hp_cost",
      "weight": 2
    },
    {
      "text": "Refuse and pray",
      "effect": "buff_wisdom",
      "weight": 1
    },
    {
      "text": "Read the fine print",
      "effect": "reveal_weakness",
      "weight": 1
    }
  ]
},
{
  "category": "treasure",
  "weight": 3,
  "slots": {
    "treasure": [
      "a jar of manna that never spoils",
      "a fleece wet with dew alone",
      "a stone the builders rejected",
      "a coin from the temple",
      "a vial of oil that anoints",
      "a cloak woven by widows",
      "a lamp that trims itself"
    ],
    "treasure_sign": [
      "glows with old holiness",
      "bears a mark of the Most High",
      "is warm to the touch",
      "whispers a psalm",
      "shines with stored mercy",
      "hums with patient light"
    ]
  },
  "text": "You find {treasure}. It {treasure_sign}, yet the price of keeping it is not written.",
  "choices": [
    {
      "text": "Take it for the road",
      "effect": "random_item",
      "weight": 2
    },
    {
      "text": "Bless it first",
      "effect": "safe_item",
      "weight": 1
    },
    {
      "text": "Study its mark",
      "effect": "reveal_truth",
      "weight": 1
    }
  ]
},
{
  "category": "treasure",
  "weight": 3,
  "slots": {
    "treasure": [
      "a crown of twelve stars",
      "a pearl of great price",
      "a sword beaten from a plowshare",
      "a scroll sealed with seven seals",
      "a well that gives living water",
      "a branch of the true vine"
    ],
    "treasure_guard": [
      "is guarded by a sleeping seraph",
      "lies where the floor once burned",
      "rests on a bone altar",
      "is wrapped in a shroud",
      "sits beneath a weeping icon",
      "is chained to the wall"
    ]
  },
  "text": "A {treasure} {treasure_guard}. To reach it you must disturb the holy still.",
  "choices": [
    {
      "text": "Reach past the guard",
      "effect": "random_item",
      "weight": 2
    },
    {
      "text": "Wake and ask leave",
      "effect": "angel_appears",
      "weight": 1
    },
    {
      "text": "Read the seal",
      "effect": "reveal_secret",
      "weight": 1
    }
  ]
},
{
  "category": "hazard",
  "weight": 3,
  "slots": {
    "hazard": [
      "a ceiling of falling teeth",
      "a river of quickened glass",
      "a bell that rings itself",
      "a staircase that forgets its steps",
      "a fog that prays your sins aloud",
      "a floor of snoring stone",
      "a wind that carries knives"
    ],
    "hazard_sign": [
      "screams your name",
      "shivers with intent",
      "breathes frost",
      "closes like a mouth",
      "chants the litany of the lost",
      "hums with old hunger"
    ]
  },
  "text": "A {hazard} looms. It {hazard_sign}, and there is no wall between you and it.",
  "choices": [
    {
      "text": "Speak a warding verse",
      "effect": "verse_defense_check",
      "weight": 2
    },
    {
      "text": "Run through it",
      "effect": "speed_check",
      "weight": 1
    },
    {
      "text": "Stand and watch",
      "effect": "reveal_weakness",
      "weight": 1
    }
  ]
},
{
  "category": "hazard",
  "weight": 3,
  "slots": {
    "hazard": [
      "a bridge of knotted hair",
      "a pit of used-up prayers",
      "a door of pressed light",
      "a curtain of woven nerve",
      "a chasm bridged by a promise",
      "a ladder slick with oil"
    ],
    "hazard_sign": [
      "creaks like a dying thing",
      "wavers as you step",
      "weeps silent drops",
      "sings a warning",
      "smells of the deep",
      "bends toward the fall"
    ]
  },
  "text": "Before you {hazard} and it {hazard_sign}. One false move and the dark takes you.",
  "choices": [
    {
      "text": "Cross with a verse",
      "effect": "verse_defense_check",
      "weight": 2
    },
    {
      "text": "Leap across",
      "effect": "skill_check",
      "weight": 1
    },
    {
      "text": "Study the span",
      "effect": "reveal_hidden",
      "weight": 1
    }
  ]
},
{
  "category": "healing",
  "weight": 3,
  "slots": {
    "source": [
      "a fig tree that blooms in winter",
      "a spring the woman touched",
      "a wound that pours balm",
      "a bread that breaks into warmth",
      "a lamp whose oil mends",
      "a dew that heals the blind"
    ],
    "source_feel": [
      "radiates quiet life",
      "tingles like a blessing",
      "draws out the ache",
      "sings without a voice",
      "warms the old scars",
      "pulls the fever down"
    ]
  },
  "text": "You come upon {source}. It {source_feel}, and your wounds remember they can close.",
  "choices": [
    {
      "text": "Receive the gift",
      "effect": "heal_amount",
      "weight": 2
    },
    {
      "text": "Save it for the dying",
      "effect": "store_heal",
      "weight": 1
    },
    {
      "text": "Learn its name",
      "effect": "learn_verse",
      "weight": 1
    }
  ]
},
{
  "category": "healing",
  "weight": 3,
  "slots": {
    "source": [
      "a pool stirred by an angel",
      "a balm from Gilead",
      "a leaf from the tree of life",
      "a cup of new wine",
      "a handprint left in the wall",
      "a breath that smells of morning"
    ],
    "source_feel": [
      "waits for the troubled",
      "glows with mercy",
      "breathes onto your hurt",
      "leans toward the weak",
      "shines on the broken",
      "settles the shaking"
    ]
  },
  "text": "A {source} finds you. It {source_feel}, and for a moment the pit forgets you.",
  "choices": [
    {
      "text": "Drink and be whole",
      "effect": "heal_amount",
      "weight": 2
    },
    {
      "text": "Share with a stranger",
      "effect": "heal_less_more_later",
      "weight": 1
    },
    {
      "text": "Ask the source",
      "effect": "permanent_knowledge",
      "weight": 1
    }
  ]
},
{
  "category": "map_event",
  "weight": 2,
  "slots": {
    "reveal": [
      "the stair down to the next tier",
      "a room of stored verses",
      "the Stalker's resting place",
      "a river you can drink",
      "a gate sealed from inside",
      "a path that loops to safety"
    ],
    "reveal_medium": [
      "a child's drawing in ash",
      "a map scratched in bone",
      "a dream of the floor",
      "a whisper on the wind",
      "a light that traces walls",
      "a reflection in blood"
    ]
  },
  "text": "A {reveal_medium} shows you {reveal}. The way you missed lies open now.",
  "choices": [
    {
      "text": "Mark it down",
      "effect": "reveal_map_node",
      "weight": 1
    },
    {
      "text": "Commit it to memory",
      "effect": "reveal_map",
      "weight": 1
    },
    {
      "text": "Ignore the omen",
      "effect": "nothing",
      "weight": 1
    }
  ]
},
{
  "category": "map_event",
  "weight": 2,
  "slots": {
    "reveal": [
      "where the demons nest",
      "a shortcut past the ward",
      "the well of living water",
      "a trap yet unsprung",
      "the exit you walked past",
      "a chapel hidden in stone"
    ],
    "reveal_medium": [
      "a bird that maps with song",
      "a vein of light in the rock",
      "a voice behind the wall",
      "a scroll that unfolds itself",
      "a star that will not move",
      "a shadow that points"
    ]
  },
  "text": "Something {reveal_medium} reveals {reveal} to your wondering eyes.",
  "choices": [
    {
      "text": "Trace it on your map",
      "effect": "reveal_map",
      "weight": 2
    },
    {
      "text": "Walk it blindly",
      "effect": "safe_discover",
      "weight": 1
    },
    {
      "text": "Question the sign",
      "effect": "reveal_truth",
      "weight": 1
    }
  ]
},
{
  "category": "BOOK_OF_REVELATION",
  "weight": 2,
  "slots": {
    "horseman": [
      "the rider on the pale horse",
      "the one who bears a pair of scales",
      "the rider crowned with many crowns",
      "the angel with the key of the abyss",
      "the woman clothed with the sun",
      "the beast from the sea"
    ],
    "horseman_act": [
      "measures the wheat and the poor",
      "sweeps the earth with peace removed",
      "opens a war without end",
      "looses the locusts below",
      "flees the dragon's wrath",
      "demands the mark of all"
    ]
  },
  "text": "You witness {horseman_act} as {horseman} passes, and the age turns toward its end.",
  "choices": [
    {
      "text": "Stand as a witness",
      "effect": "prophetic_vision",
      "weight": 1
    },
    {
      "text": "Seal your eyes",
      "effect": "buff_wisdom",
      "weight": 1
    },
    {
      "text": "Loot the fallen world",
      "effect": "gold_or_hp_cost",
      "weight": 1
    }
  ]
},
{
  "category": "BOOK_OF_REVELATION",
  "weight": 2,
  "slots": {
    "dragon": [
      "the great red dragon",
      "the ancient serpent",
      "the accuser of the brethren",
      "the beast with ten horns",
      "the false prophet",
      "the locust king Abaddon"
    ],
    "dragon_deed": [
      "drags a third of the stars down",
      "opens its mouth on the faithful",
      "stands on the sand of the sea",
      "makes war on the sealed",
      "casts fire to deceive",
      "claims the throne of the pit"
    ]
  },
  "text": "In the deep {dragon} {dragon_deed}, and the host of heaven recoils.",
  "choices": [
    {
      "text": "Read the omen",
      "effect": "reveal_weakness",
      "weight": 1
    },
    {
      "text": "Stand against it",
      "effect": "combat_bonus",
      "weight": 1
    },
    {
      "text": "Flee the prophecy",
      "effect": "avoid_nemesis",
      "weight": 1
    }
  ]
},
{
  "category": "OLD_TESTAMENT",
  "weight": 2,
  "slots": {
    "wanderer": [
      "a bush that burns and is not spent",
      "a rock struck in the wilderness",
      "a pillar of cloud by day",
      "a manna field in the morn",
      "a serpent lifted on a pole",
      "a staff that blossoms"
    ],
    "wanderer_sign": [
      "speaks your name in flame",
      "pours water for the thirst",
      "leads where the way is none",
      "feeds the grumbling host",
      "heals the bitten and fearful",
      "shows life from the dead"
    ]
  },
  "text": "Forty years in the waste, {wanderer} {wanderer_sign} and the desert tests your trust.",
  "choices": [
    {
      "text": "Follow the sign",
      "effect": "wilderness_40",
      "weight": 1
    },
    {
      "text": "Drink and remember",
      "effect": "heal_amount",
      "weight": 1
    },
    {
      "text": "Learn the lesson",
      "effect": "permanent_knowledge",
      "weight": 1
    }
  ]
},
{
  "category": "OLD_TESTAMENT",
  "weight": 2,
  "slots": {
    "judge": [
      "a judge who frees the captive",
      "a widow who refuses to stop",
      "a stranger who warms the floor",
      "a youth with a sling",
      "a carpenter who fells a giant",
      "a brother who spares a brother"
    ],
    "judge_deed": [
      "delivers Israel by faith",
      "wears down the unjust judge",
      "keeps covenant in secret",
      "fells the giant with one stone",
      "builds the temple of peace",
      "shows mercy over revenge"
    ]
  },
  "text": "A {judge} stands before the pit and {judge_deed}. Will you walk as they did?",
  "choices": [
    {
      "text": "Walk in their way",
      "effect": "combat_bonus",
      "weight": 1
    },
    {
      "text": "Study their faith",
      "effect": "learn_verse",
      "weight": 1
    },
    {
      "text": "Pass them by",
      "effect": "neutral",
      "weight": 1
    }
  ]
},
{
  "category": "GEOGRAPHIC",
  "weight": 2,
  "slots": {
    "gorge": [
      "a chasm of whispered names",
      "a valley of dry bones",
      "a plain of standing salt",
      "a rift of echoed prayers",
      "a hollow of old snow",
      "a canyon of hanging light"
    ],
    "gorge_cross": [
      "a rope of braided hair",
      "a bridge of remembered verses",
      "stones that rise to meet you",
      "a ford of still fire",
      "a path that sinks then climbs",
      "a stair carved by wind"
    ]
  },
  "text": "You face {gorge}, crossed only by {gorge_cross}. The far side promises the road on.",
  "choices": [
    {
      "text": "Cross with a verse",
      "effect": "verse_path",
      "weight": 1
    },
    {
      "text": "Wade the deep",
      "effect": "hp_cost_random",
      "weight": 1
    },
    {
      "text": "Map the far shore",
      "effect": "reveal_map",
      "weight": 2
    }
  ]
},
{
  "category": "GEOGRAPHIC",
  "weight": 2,
  "slots": {
    "waste": [
      "a field of shattered commandments",
      "a shore where the sea obeys",
      "a hill of skulls and silence",
      "a garden gone to thorn",
      "a town where no bell rings",
      "a plain of scattered armor"
    ],
    "waste_danger": [
      "the stone accuses",
      "the tide waits to part",
      "the silence preaches",
      "the thorn guards a gate",
      "the quiet hides a watcher",
      "the armor fits the dead"
    ]
  },
  "text": "You cross {waste} where {waste_danger}. The ground itself weighs your steps.",
  "choices": [
    {
      "text": "Press across",
      "effect": "mountain_climb",
      "weight": 1
    },
    {
      "text": "Pray for footing",
      "effect": "heal_amount",
      "weight": 1
    },
    {
      "text": "Read the ground",
      "effect": "reveal_secret",
      "weight": 1
    }
  ]
},
{
  "category": "GAMBLING",
  "weight": 2,
  "slots": {
    "wager": [
      "your name against the dark",
      "a verse for a kingdom",
      "your breath on the flip",
      "gold against a soul",
      "a prayer on the cast",
      "your shadow for sight"
    ],
    "gambler": [
      "a shade who deals in futures",
      "a duke of the crooked table",
      "a liar with honest eyes",
      "the Stalker's gamester",
      "a demon of loaded fate",
      "a ghost who bets on despair"
    ]
  },
  "text": "{gambler} lays the table and asks you to stake {wager}.",
  "choices": [
    {
      "text": "Take the wager",
      "effect": "bet_gold",
      "weight": 1
    },
    {
      "text": "Read the odds",
      "effect": "reveal_truth",
      "weight": 1
    },
    {
      "text": "Leave the game",
      "effect": "neutral",
      "weight": 1
    }
  ]
},
{
  "category": "GAMBLING",
  "weight": 2,
  "slots": {
    "dice": [
      "bones that recall your sins",
      "a wheel of weeping eyes",
      "cards inked in blood",
      "a coin of two judgments",
      "lots cast at the foot",
      "a spindle that measures days"
    ],
    "dice_stakes": [
      "a life for a verse",
      "gold for a name",
      "freedom for a year",
      "sight for a soul",
      "peace for power",
      "mercy for a price"
    ]
  },
  "text": "A game of {dice} is set, its stakes: {dice_stakes}.",
  "choices": [
    {
      "text": "Roll the cast",
      "effect": "dice_demon",
      "weight": 1
    },
    {
      "text": "See through the trick",
      "effect": "wisdom_reveal",
      "weight": 1
    },
    {
      "text": "Refuse to play",
      "effect": "nothing",
      "weight": 1
    }
  ]
},
{
  "category": "CHORUS_OF_HELL",
  "weight": 2,
  "slots": {
    "hellsong": [
      "a hymn of the forgotten name",
      "a litany of the pit",
      "a chant that unbuilds prayer",
      "a song of the first betrayal",
      "a chorus of the unshriven",
      "a melody that eats light"
    ],
    "hellsong_effect": [
      "it loosens your grip on truth",
      "it hums your grave",
      "it opens a door in you",
      "it dims the verses you know",
      "it calls your fear by name",
      "it weaves a noose of sound"
    ]
  },
  "text": "From the dark {hellsong} rises and {hellsong_effect}, and the air turns to iron.",
  "choices": [
    {
      "text": "Sing against it",
      "effect": "counter_praise",
      "weight": 1
    },
    {
      "text": "Steal its secret",
      "effect": "reveal_weakness",
      "weight": 1
    },
    {
      "text": "Break the song",
      "effect": "combat_start",
      "weight": 1
    }
  ]
},
{
  "category": "SCRIPTURE_WALK",
  "weight": 2,
  "slots": {
    "verse": [
      "I am the resurrection",
      "My yoke is easy",
      "Lo, I am with you always",
      "The meek shall inherit",
      "Come to the water",
      "In my Father's house"
    ],
    "path": [
      "a road of broken altars",
      "a stair of answered pleas",
      "a bridge of spoken covenants",
      "a gate of remembered names",
      "a floor of trodden verses",
      "a tunnel of whispered psalms"
    ]
  },
  "text": "{path} yields only to one who walks it speaking {verse}.",
  "choices": [
    {
      "text": "Speak and walk",
      "effect": "verse_path",
      "weight": 1
    },
    {
      "text": "Recite a wrong word",
      "effect": "wrong_verse",
      "weight": 1
    },
    {
      "text": "Read the path first",
      "effect": "learn_verse",
      "weight": 1
    }
  ]
},
{
  "category": "MARTYRDOM",
  "weight": 2,
  "slots": {
    "martyr": [
      "a sealed font that needs a life to open",
      "a chain on the pit needing a flesh key",
      "a light that dies without a flame",
      "a gate that opens on a willing heart",
      "a plague only blood can stay",
      "a bell that rings for the sacrificed"
    ],
    "martyr_reward": [
      "the captives are unbound",
      "the floor is undone",
      "the Stalker is wounded",
      "the seal is broken",
      "the pit grows weak",
      "the lost are remembered"
    ]
  },
  "text": "{martyr_reward} but the price is that {martyr} must be given freely.",
  "choices": [
    {
      "text": "Give yourself",
      "effect": "martyr_self",
      "weight": 1
    },
    {
      "text": "Seek another road",
      "effect": "third_option",
      "weight": 1
    },
    {
      "text": "Learn the cost",
      "effect": "reveal_truth",
      "weight": 1
    }
  ]
},
{
  "category": "discovery",
  "weight": 2,
  "slots": {
    "ruin": [
      "a sealed iron casket",
      "a crumbling confessional",
      "a buried reliquary",
      "a shattered icon of a saint",
      "a chest of drowned letters",
      "a hollowed and silent bell"
    ],
    "ruin_secret": [
      "a verse glows on the lid",
      "something inside still breathes",
      "a name is scratched in hope",
      "the lock remembers your hand",
      "light leaks from the seam",
      "a psalm hums in the dark"
    ]
  },
  "text": "Among the rubble you uncover {ruin}; {ruin_secret}, and the air turns cold.",
  "choices": [
    {
      "text": "Investigate the glow",
      "effect": "learn_verse_or_trap",
      "weight": 2
    },
    {
      "text": "Pray over it first",
      "effect": "safe_discover",
      "weight": 1
    },
    {
      "text": "Leave it alone",
      "effect": "nothing",
      "weight": 1
    }
  ]
},
{
  "category": "discovery",
  "weight": 2,
  "slots": {
    "relic": [
      "a severed wing of light",
      "a vial of saint's tears",
      "a compass that points to sin",
      "a page torn from a gospel",
      "a coin from a dead city",
      "a feather of quiet judgment"
    ],
    "relic_speaks": [
      "it names the room ahead",
      "it whispers a hidden verse",
      "it shows a path downward",
      "it recalls a forgotten name",
      "it warns of the Stalker",
      "it sings a line of truth"
    ]
  },
  "text": "You stumble on {relic}; {relic_speaks}, and you feel watched by something holy.",
  "choices": [
    {
      "text": "Listen to the relic",
      "effect": "reveal_truth",
      "weight": 2
    },
    {
      "text": "Take it with you",
      "effect": "random_item",
      "weight": 1
    },
    {
      "text": "Leave it be",
      "effect": "nothing",
      "weight": 1
    }
  ]
},
{
  "category": "demon_talk",
  "weight": 3,
  "slots": {
    "demon_plea": [
      "\"I bore the name of an archangel once\"",
      "\"Your suffering is my suffering\"",
      "\"The Stalker fears one verse\"",
      "\"I can show you the way out\"",
      "\"We were cast down together\"",
      "\"Spare me and I will teach\""
    ],
    "demon_shape": [
      "a serpent wound in light",
      "a weeping child of ash",
      "a scholar with no face",
      "a mirror of your mother",
      "a chorus of soft voices",
      "a beggar wreathed in shadow"
    ]
  },
  "text": "A demon pleads: {demon_plea} It wears the shape of {demon_shape}.",
  "choices": [
    {
      "text": "Counter with Scripture",
      "effect": "damage_demon",
      "weight": 1
    },
    {
      "text": "Hear its secret",
      "effect": "gain_knowledge_lose_hp",
      "weight": 1
    },
    {
      "text": "Strike it down",
      "effect": "combat_start",
      "weight": 1
    }
  ]
},
{
  "category": "demon_talk",
  "weight": 3,
  "slots": {
    "demon_offer2": [
      "the true name of the Stalker",
      "a verse that unmakes walls",
      "the location of a lost soul",
      "forgiveness you do not deserve",
      "the memory of your baptism",
      "a map of the floors below"
    ],
    "demon_mask": [
      "a tongue of silver",
      "eyes like wounded stars",
      "hands that once healed",
      "the voice of a dead friend",
      "a halo of cold fire",
      "a smile too gentle"
    ]
  },
  "text": "The demon trades flattery for trust: {demon_offer2}, wearing {demon_mask}.",
  "choices": [
    {
      "text": "Take the name",
      "effect": "reveal_weakness",
      "weight": 2
    },
    {
      "text": "Refuse and bind it",
      "effect": "combat_start",
      "weight": 1
    },
    {
      "text": "Pretend to agree",
      "effect": "reverseDeal",
      "weight": 1
    }
  ]
},
{
  "category": "nemesis_hint",
  "weight": 1,
  "slots": {
    "stalker_sign": [
      "a wall flayed by its claws",
      "a scent of cold iron",
      "footprints that breathe",
      "a feather plucked from its wing",
      "a door it tore from its hinge",
      "a name it scratched in panic"
    ],
    "stalker_mood": [
      "fresh, and moving closer",
      "old, but circling back",
      "waiting beyond the dark",
      "wounded, and furious",
      "watching from the next room",
      "humming the tune of your fear"
    ]
  },
  "text": "You find {stalker_sign}. The sign is {stalker_mood}. The Stalker is hunting you.",
  "choices": [
    {
      "text": "Study the sign",
      "effect": "reveal_weakness",
      "weight": 1
    },
    {
      "text": "Set a snare",
      "effect": "trap_for_nemesis",
      "weight": 1
    },
    {
      "text": "Flee deeper",
      "effect": "avoid_nemesis",
      "weight": 1
    }
  ]
},
{
  "category": "nemesis_hint",
  "weight": 1,
  "slots": {
    "stalker_voice": [
      "a whisper in your own voice",
      "a growl through the stone",
      "a child laughing in the vents",
      "a tolling that follows you",
      "a hiss at the edge of sleep",
      "a prayer spoken backwards"
    ],
    "stalker_promise": [
      "\"Come to me and rest\"",
      "\"I already know your verse\"",
      "\"Your soul is mine by right\"",
      "\"We will finish what began\"",
      "\"No angel will reach you here\"",
      "\"I named you before you fell\""
    ]
  },
  "text": "The Stalker speaks - {stalker_voice}: {stalker_promise}.",
  "choices": [
    {
      "text": "Mark its words",
      "effect": "permanent_knowledge",
      "weight": 1
    },
    {
      "text": "Draw your weapon",
      "effect": "combat_start",
      "weight": 1
    },
    {
      "text": "Flee and hide",
      "effect": "avoid_nemesis",
      "weight": 1
    }
  ]
},
{
  "category": "choir",
  "weight": 1,
  "slots": {
    "choir_song": [
      "a lament no mouth should sing",
      "a hymn with the words reversed",
      "a chant that bends the light",
      "a harmony of weeping",
      "a song of the lost thrones",
      "a melody that names the dead"
    ],
    "choir_source": [
      "from a pit of open mouths",
      "behind a wall of bone",
      "above you in the black",
      "within your own chest",
      "from a fissure of light",
      "under the floor of ash"
    ]
  },
  "text": "A {choir_source} rises - {choir_song}. The sound pulls at your ribs.",
  "choices": [
    {
      "text": "Join the singing",
      "effect": "join_chorus",
      "weight": 1
    },
    {
      "text": "Listen for meaning",
      "effect": "reveal_secret",
      "weight": 1
    },
    {
      "text": "Wall your ears",
      "effect": "mental_resistance",
      "weight": 1
    }
  ]
},
{
  "category": "choir",
  "weight": 1,
  "slots": {
    "choir_angel": [
      "a host of faceless singers",
      "a single voice like thunder",
      "a chorus robed in shadow",
      "a choir of the unfallen",
      "a wounded choir of saints",
      "a song that is also a sword"
    ],
    "choir_effect": [
      "it heals a hidden wound",
      "it reveals a hidden door",
      "it stills the demons near",
      "it shows you a verse",
      "it warns of the Stalker",
      "it breaks a lock of bone"
    ]
  },
  "text": "You hear {choir_angel}; {choir_effect}, and the corridor holds its breath.",
  "choices": [
    {
      "text": "Walk toward it",
      "effect": "find_choir",
      "weight": 1
    },
    {
      "text": "Learn the verse",
      "effect": "learn_verse",
      "weight": 2
    },
    {
      "text": "Stand and pray",
      "effect": "full_heal_small",
      "weight": 1
    }
  ]
},
{
  "category": "enemy_trick",
  "weight": 2,
  "slots": {
    "trick_form": [
      "a bridge of frozen lies",
      "a door painted on the wall",
      "a treasure that is a mouth",
      "a stair that climbs nowhere",
      "a friend who is a wound",
      "a light that is a snare"
    ],
    "trick_disguise": [
      "shimmers like welcome",
      "smiles with your face",
      "glows like mercy",
      "calls you by name",
      "smells of home",
      "sings like a mother"
    ]
  },
  "text": "It is a trap. {trick_form} {trick_disguise}, waiting to close.",
  "choices": [
    {
      "text": "React in time",
      "effect": "dodge_check",
      "weight": 2
    },
    {
      "text": "Read it with wisdom",
      "effect": "wisdom_reveal",
      "weight": 1
    },
    {
      "text": "Take the blow",
      "effect": "hp_cost_random",
      "weight": 1
    }
  ]
},
{
  "category": "enemy_trick",
  "weight": 2,
  "slots": {
    "trick_demon": [
      "a demon of mirrors",
      "a prince of small lies",
      "a thing of flickering skin",
      "a trader with no shadow",
      "a beast made of rumor",
      "a spirit of cracked glass"
    ],
    "trick_bait": [
      "offers you your own face",
      "shows a path of gold",
      "promises the exit",
      "mirrors a fallen angel",
      "breathes a false verse",
      "holds up a key of bone"
    ]
  },
  "text": "A {trick_demon} {trick_bait}. It is too perfect to be true.",
  "choices": [
    {
      "text": "Strike the reflection",
      "effect": "damage_demon",
      "weight": 1
    },
    {
      "text": "See through it",
      "effect": "reveal_truth",
      "weight": 2
    },
    {
      "text": "Take the bait",
      "effect": "gold_or_hp_cost",
      "weight": 1
    }
  ]
},
{
  "category": "MIRACLE",
  "weight": 2,
  "slots": {
    "miracle_light": [
      "a storm above the sea",
      "six jars at the wedding",
      "five loaves in your hands",
      "a leper at the gate",
      "a fig tree by the road",
      "a deaf man in the square"
    ],
    "miracle_act": [
      "the wind waits for a word",
      "the water is called to wine",
      "the crowd waits to be fed",
      "the sores wait to be cleansed",
      "the branch waits to wither",
      "the ear waits to open"
    ]
  },
  "text": "Before {miracle_light}, {miracle_act}. Faith is asked of you.",
  "choices": [
    {
      "text": "Step out in faith",
      "effect": "walk_water",
      "weight": 1
    },
    {
      "text": "Give all away",
      "effect": "multiply_loaves",
      "weight": 1
    },
    {
      "text": "Keep to yourself",
      "effect": "gold_or_hp_cost",
      "weight": 1
    }
  ]
},
{
  "category": "MIRACLE",
  "weight": 2,
  "slots": {
    "miracle_sign": [
      "water turned to wine",
      "a net full beyond breaking",
      "a coin from a fish's mouth",
      "a blind man given sight",
      "a storm walked upon",
      "bread fallen as dew"
    ],
    "miracle_offer": [
      "it fills the empty jars",
      "it breaks the net with plenty",
      "it pays the temple tax",
      "it opens the sealed eyes",
      "it stills the raging deep",
      "it feeds the wandering host"
    ]
  },
  "text": "A sign is given: {miracle_sign} - {miracle_offer}. The impossible asks your trust.",
  "choices": [
    {
      "text": "Receive it humbly",
      "effect": "heal_amount",
      "weight": 2
    },
    {
      "text": "Share it abroad",
      "effect": "mercy_reward",
      "weight": 1
    },
    {
      "text": "Doubt and turn",
      "effect": "hp_cost_random",
      "weight": 1
    }
  ]
},
{
  "category": "ANGELIC_ENCOUNTERS",
  "weight": 2,
  "slots": {
    "angel_form": [
      "a column of living fire",
      "a winged one with many eyes",
      "a messenger wrapped in linen",
      "a sentinel of whirling swords",
      "a presence too bright to name",
      "a cherubim whose wings are wheels"
    ],
    "angel_deed": [
      "it writes your name in light",
      "it seals a wound you hid",
      "it stands between you and the pit",
      "it unfolds a scroll of stars",
      "it names the Stalker aloud",
      "it bars a door of shadow"
    ]
  },
  "text": "An {angel_form} descends and {angel_deed}. The air is terrible and holy.",
  "choices": [
    {
      "text": "Fall and worship",
      "effect": "angel_appears",
      "weight": 1
    },
    {
      "text": "Ask what it guards",
      "effect": "angel_truth",
      "weight": 1
    },
    {
      "text": "Raise your blade",
      "effect": "combat_start",
      "weight": 1
    }
  ]
},
{
  "category": "ANGELIC_ENCOUNTERS",
  "weight": 1,
  "slots": {
    "angel_charge": [
      "a legion of the pit charges",
      "the Stalker's hound breaks through",
      "a wave of the damned surges",
      "a prince of lies advances",
      "a host of the fallen swarms",
      "a beast of bone attacks"
    ],
    "angel_foe": [
      "an archangel intercepts",
      "a flaming sword sweeps down",
      "a wall of wings erects",
      "light splits the assault",
      "Michael answers the call",
      "the host forms a shield"
    ]
  },
  "text": "As {angel_charge}, {angel_foe}. You may stand in the breach.",
  "choices": [
    {
      "text": "Fight at its side",
      "effect": "angel_fights",
      "weight": 1
    },
    {
      "text": "Let the host prevail",
      "effect": "combat_bonus",
      "weight": 1
    },
    {
      "text": "Flee the glory",
      "effect": "flee_or_damage",
      "weight": 1
    }
  ]
},
{
  "category": "TEMPORAL",
  "weight": 1,
  "slots": {
    "temporal_loop": [
      "the last breath replays",
      "the corridor rewinds",
      "a death repeats itself",
      "the bell tolls again",
      "your last word returns",
      "the door unlocks once more"
    ],
    "temporal_cause": [
      "a shattered hourglass",
      "a demon's dying curse",
      "a saint who weeps backward",
      "the dungeon's own heartbeat",
      "a relic that remembers",
      "a verse spoken in reverse"
    ]
  },
  "text": "A {temporal_cause} traps you - {temporal_loop}. Time folds against itself.",
  "choices": [
    {
      "text": "Break it with a verse",
      "effect": "time_loop",
      "weight": 1
    },
    {
      "text": "Endure and learn",
      "effect": "buff_wisdom",
      "weight": 1
    },
    {
      "text": "Race the loop",
      "effect": "random_positive",
      "weight": 1
    }
  ]
},
{
  "category": "TEMPORAL",
  "weight": 1,
  "slots": {
    "temporal_gift": [
      "a glimpse of your ending",
      "the moment you first fell",
      "a future floor revealed",
      "the Stalker's birth",
      "a friend's last prayer",
      "the sealing of the pit"
    ],
    "temporal_how": [
      "a mirror shows",
      "the Lamb unveils",
      "a star writes it",
      "silence speaks it",
      "a scroll turns to it",
      "an angel breathes it"
    ]
  },
  "text": "{temporal_how} a temporal gift: {temporal_gift}.",
  "choices": [
    {
      "text": "Prepare for it",
      "effect": "future_vision",
      "weight": 1
    },
    {
      "text": "Record the sight",
      "effect": "permanent_knowledge",
      "weight": 1
    },
    {
      "text": "Deny what you saw",
      "effect": "courage_check",
      "weight": 1
    }
  ]
},
{
  "category": "LOST_SOULS",
  "weight": 2,
  "slots": {
    "lost_soul": [
      "a child who never prayed",
      "a monk who denied his vow",
      "a mother lost in search",
      "a soldier who cursed God",
      "a poet of forgotten psalms",
      "a thief who sought mercy"
    ],
    "lost_bond": [
      "a chain of weeping iron",
      "a cage of frozen glass",
      "a thread of spinning smoke",
      "a ring of broken salt",
      "a name struck from the book",
      "a veil of silent thread"
    ]
  },
  "text": "A {lost_soul} is held by {lost_bond}, awaiting a judgement not yet spoken.",
  "choices": [
    {
      "text": "Free the soul",
      "effect": "free_soul",
      "weight": 1
    },
    {
      "text": "Free it, pay the price",
      "effect": "gold_or_hp_cost",
      "weight": 1
    },
    {
      "text": "Leave it to wait",
      "effect": "leave_soul",
      "weight": 1
    }
  ]
},
{
  "category": "LOST_SOULS",
  "weight": 1,
  "slots": {
    "lost_message": [
      "a plea to be remembered",
      "the name of the Stalker",
      "a verse they died with",
      "a warning of the pit",
      "a confession unsaid",
      "the location of others"
    ],
    "lost_messenger": [
      "a soul brushes your hand",
      "a shade mouths the words",
      "a voice leaks from the stone",
      "a face forms in the dark",
      "a whisper finds your ear",
      "a tear falls without a body"
    ]
  },
  "text": "{lost_messenger} and carries {lost_message} across the dark.",
  "choices": [
    {
      "text": "Hear the message",
      "effect": "reveal_truth",
      "weight": 2
    },
    {
      "text": "Carry it onward",
      "effect": "permanent_knowledge",
      "weight": 1
    },
    {
      "text": "Shut your heart",
      "effect": "neutral",
      "weight": 1
    }
  ]
},
{
  "category": "SACRIFICIAL_ALTAR",
  "weight": 1,
  "slots": {
    "altar_demand": [
      "your memory of the sun",
      "a year of your life",
      "the name of one you loved",
      "your voice for a day",
      "a verse carved in your hand",
      "your fear, laid bare"
    ],
    "altar_reward": [
      "a door of bone opens",
      "a foe is unmade",
      "sight past the veil",
      "a shield of cold iron",
      "the Stalker's trail burns",
      "a strength not your own"
    ]
  },
  "text": "The altar of sacrifice demands {altar_demand}; in return, {altar_reward}.",
  "choices": [
    {
      "text": "Give what is asked",
      "effect": "choose_sacrifice",
      "weight": 1
    },
    {
      "text": "Offer gold instead",
      "effect": "alternative_sacrifice",
      "weight": 1
    },
    {
      "text": "Spurn the altar",
      "effect": "nothing",
      "weight": 1
    }
  ]
},
{
  "category": "DARK_COMMUNION",
  "weight": 1,
  "slots": {
    "dark_rite": [
      "a communion of cold ash",
      "a mass sung in reverse",
      "a rite beneath a black cross",
      "a feast of the unshriven",
      "a baptism in still shadow",
      "a breaking of the forbidden bread"
    ],
    "dark_grant": [
      "a strength that devours",
      "sight of the deepest pit",
      "a voice that commands fear",
      "a shield forged of hate",
      "the Stalker's own favor",
      "a power that remembers sin"
    ]
  },
  "text": "A {dark_rite} is offered, and {dark_grant} to any who will kneel.",
  "choices": [
    {
      "text": "Partake for power",
      "effect": "dark_ritual",
      "weight": 1
    },
    {
      "text": "Refuse and pray",
      "effect": "refuse_ritual",
      "weight": 1
    },
    {
      "text": "Break the rite",
      "effect": "damage_demon",
      "weight": 1
    }
  ]
},
  ],

  // ── EFFECT RESOLUTION ─────────────────────────────────────
  resolveEffect(effect, game) {
    const ctx = {
      hp: game.hp,
      maxHp: game.maxHp,
      gold: game.gold,
      floor: game.floor,
      knownVerses: KnowledgeSystem.getAvailableVerses(),
    };

    switch (effect) {
      case 'random_positive': {
        const roll = RNG.random();
        if (roll < 0.3) return { heal: 15, text: 'They heal your wounds. +15 HP.' };
        if (roll < 0.6) return { learnVerse: true, text: 'They teach you a verse.' };
        return { gold: 20, text: 'They share their gold. +20 gold.' };
      }
      case 'nothing': return { text: 'Nothing happens. You move on.' };
      case 'reveal_weakness': return { revealWeakness: true, text: 'They share knowledge of demon weaknesses.' };
      case 'skill_check': {
        if (RNG.random() < 0.6) return { text: 'You navigate the trap safely!' };
        return { hpCost: Math.floor(game.maxHp * 0.1), text: 'You get caught! -10% HP.' };
      }
      case 'hp_cost_random': return { hpCost: RNG.randint(5, 15), text: `You take ${RNG.randint(5,15)} damage.` };
      case 'reveal_hidden': return { revealSecret: true, text: 'You discover a hidden passage.' };
      case 'buff_wisdom': return { buff: 'wisdom', text: 'Your wisdom grows. Next verse does +50% damage.' };
      case 'buff_defense': return { buff: 'defense', text: 'Your faith hardens you. +2 defense.' };
      case 'buff_attack': return { buff: 'attack', text: 'Conviction fills you. +3 attack.' };
      case 'combat_bonus': return { combatBonus: 10, text: 'The moment favors you. +10 combat advantage.' };
      case 'gold_or_hp_cost': {
        if (RNG.random() < 0.5) return { gold: 30, text: 'You gain 30 gold! But something feels wrong...' };
        return { hpCost: 15, text: 'The temptation drains your life force. -15 HP.' };
      }
      case 'reveal_truth': return { revealAll: true, text: 'The truth is revealed! All weaknesses exposed.' };
      case 'reveal_secret': return { revealSecret: true, text: 'A secret of the floor is laid bare.' };
      case 'learn_verse_or_trap': {
        if (RNG.random() < 0.4) return { learnVerse: true, text: 'You learn a new verse!' };
        return { hpCost: 10, text: 'It was a trap! -10 HP.' };
      }
      case 'safe_discover': return { learnVerse: true, gold: 15, text: 'Prayer protects you. You find a verse and 15 gold.' };
      case 'mercy_reward': return { heal: 20, learnVerse: true, text: 'Mercy rewarded. +20 HP and a new verse.' };
      case 'justice_reward': return { gold: 25, text: 'Justice served. +25 gold.' };
      case 'neutral': return { text: 'You walk away. Sometimes the best choice is no choice.' };
      case 'psalm_path': case 'john_path': case 'ephesians_path': {
        if (RNG.random() < 0.5) return { learnVerse: true, text: 'The path opens! You learn a verse.' };
        return { hpCost: 8, text: 'The verse echoes but the path remains. -8 HP.' };
      }
      case 'random_item': {
        if (RNG.random() < 0.3) return { learnVerse: true, text: 'It contains a hidden verse!' };
        return { gold: 15 + game.floor * 5, text: `You find ${15 + game.floor * 5} gold.` };
      }
      case 'safe_item': return { learnVerse: true, text: 'Prayer purifies the item. You learn a verse.' };
      case 'damage_demon': return { combatBonus: 10, text: 'Your Scripture weakens the demon. +10 combat advantage.' };
      case 'gain_knowledge_lose_hp': return { learnVerse: true, hpCost: 10, text: 'Dark knowledge. +1 verse, -10 HP.' };
      case 'combat_start': return { startCombat: true, text: 'Combat begins!' };
      case 'heal_or_verse': {
        if (RNG.random() < 0.4) return { learnVerse: true, text: 'The shrine teaches you a verse!' };
        return { heal: 25, text: 'The shrine heals you. +25 HP.' };
      }
      case 'buff_for_gold': {
        if (game.gold >= 20) return { gold: -20, buff: 'attack', text: 'Offering accepted. +3 attack.' };
        return { text: 'Not enough gold for the offering.' };
      }
      case 'reveal_map': return { revealMap: true, text: 'The path ahead is revealed.' };
      case 'learn_verse': return { learnVerse: true, text: 'You learn a new verse!' };
      case 'partial_verse': return { scrollFragment: true, text: 'You find a scroll fragment. Collect more to unlock the verse.' };
      case 'fire_damage_or_wisdom': {
        if (RNG.random() < 0.5) return { buff: 'fire', text: 'The fire teaches you. Fire verses +50%.' };
        return { hpCost: 10, text: 'The scroll burns you! -10 HP.' };
      }
      case 'verse_defense_check': {
        if (ctx.knownVerses.length >= 3) return { shield: 15, text: 'Your verses protect you! +15 shield.' };
        return { hpCost: 12, text: 'Not enough verses known. -12 HP.' };
      }
      case 'speed_check': return { hpCost: RNG.randint(5, 12), text: `You run! Took ${RNG.randint(5,12)} damage escaping.` };
      case 'courage_check': return { buff: 'defense', text: 'Your courage inspires you. +2 defense.' };
      case 'multi_combat': return { startCombat: true, multiEnemy: true, text: 'Multiple demons attack!' };
      case 'aoe_or_damage': {
        if (ctx.knownVerses.length >= 5) return { heal: 10, text: 'Your area verse clears the room! +10 HP.' };
        return { hpCost: 8, text: 'Not enough verses for area attack. Took 8 damage.' };
      }
      case 'flee_or_damage': {
        if (RNG.random() < 0.4) return { text: 'You escape! Lucky!' };
        return { hpCost: 10, text: 'Escaping costs you. -10 HP.' };
      }
      case 'heal_amount': return { heal: 15 + game.floor * 3, text: `Restoration! +${15 + game.floor * 3} HP.` };
      case 'store_heal': return { storeHeal: 10, text: 'You store healing energy for later. (+10 stored)' };
      case 'heal_less_more_later': return { heal: 10, bonusLater: true, text: 'Sharing heals you now (+10) and will reward you later.' };
      case 'full_heal_small': return { heal: game.maxHp, text: 'The hymn fills you with peace. Full heal!' };
      case 'reveal_floor_secret': return { revealSecret: true, text: 'You sense a secret on this floor.' };
      case 'find_choir': return { heal: 20, learnVerse: true, text: 'The choir teaches you a verse and heals you.' };
      case 'deal_with_demon': return { gold: 30, hpCost: 15, text: 'The deal is struck. +30 gold, -15 HP.' };
      case 'reverseDeal': return { gold: 40, text: 'You turn the demon\'s deal against it! +40 gold.' };
      case 'sacrifice_power': return { hpCost: 20, buff: 'attack', sacrificePower: true, text: 'Sacrifice accepted! -20 HP, but +5 attack permanently.' };
      case 'alternative_sacrifice': return { gold: -15, buff: 'defense', text: 'You offer gold instead. +2 defense.' };
      case 'reveal_map_node': return { revealMap: true, text: 'The map reveals hidden nodes.' };
      case 'dodge_check': {
        if (RNG.random() < 0.5) return { text: 'You dodge the trap!' };
        return { hpCost: 10, text: 'You fall for the trap! -10 HP.' };
      }
      case 'wisdom_reveal': return { revealWeakness: true, text: 'Wisdom reveals the truth behind the trick.' };
      case 'temporary_invincibility': return { invincible: 2, text: 'Divine protection! Invincible for 2 rooms.' };
      case 'random_encounter': return { startCombat: true, text: 'Something stirs in the darkness...' };
      case 'mental_resistance': return { buff: 'defense', text: 'You resist the vision. Your mind hardens.' };
      case 'permanent_knowledge': return { permanentKnowledge: true, text: 'You will never forget this.' };
      case 'buff_for_nemesis': return { buff: 'attack', text: 'You steel yourself for the Stalker. +3 attack.' };
      case 'trap_for_nemesis': return { revealSecret: true, text: 'You set a snare for the Stalker.' };
      case 'avoid_nemesis': return { text: 'You slip away before the Stalker arrives.' };
      case 'demon_talk': return { text: 'The demon listens, for a moment.' };

      // ── NEW EFFECT HANDLERS ──────────────────────────────
      case 'seal_opening': return { learnVerse: true, revealSecret: true, text: 'A seal breaks open — you learn a verse and sense a secret.' };
      case 'trumpet_sound': {
        if (RNG.random() < 0.5) return { buff: 'defense', hpCost: 8, text: 'The trumpet shakes you. -8 HP, but your faith holds (+2 defense).' };
        return { hpCost: 12, text: 'The blast deafens and wounds you. -12 HP.' };
      }
      case 'bowl_of_wrath': {
        if (RNG.random() < 0.4) return { gold: 40, text: 'Amid the plague you loot 40 gold!' };
        return { hpCost: 18, text: 'The bowl\'s plague scorches you. -18 HP.' };
      }
      case 'prophetic_vision': return { permanentKnowledge: true, learnVerse: true, text: 'You receive a revelation: a verse and lasting knowledge.' };
      case 'walk_water': return { revealMap: true, shield: 10, text: 'You walk the water unharmed. +10 shield, path revealed.' };
      case 'water_to_wine': return { heal: 20, gold: 15, text: 'The miracle refreshes you. +20 HP, +15 gold from the feast.' };
      case 'multiply_loaves': return { heal: 15 + game.floor * 2, storeHeal: 15, text: `Loaves multiply! +${15 + game.floor * 2} HP and 15 stored.` };
      case 'heal_sick': return { heal: 30 + game.floor * 3, learnVerse: true, text: `The sick one is healed and you are too. +${30 + game.floor * 3} HP, +1 verse.` };
      case 'wilderness_40': return { buff: 'wisdom', hpCost: 10, text: 'You endure the wilderness. -10 HP, but wisdom grows.' };
      case 'stones_to_bread': {
        if (RNG.random() < 0.5) return { buff: 'wisdom', text: 'You refuse the devil. Wisdom +50% vs temptation.' };
        return { hpCost: 14, text: 'Hunger weakens you. -14 HP.' };
      }
      case 'kingdoms_offer': {
        if (RNG.random() < 0.5) return { buff: 'attack', hpCost: 20, text: 'You spurn the offer but the trial cost you. -20 HP, +5 attack.' };
        return { gold: 50, hpCost: 25, text: 'The lure nearly takes you. +50 gold, -25 HP.' };
      }
      case 'lost_sheep': return { heal: 15, learnVerse: true, text: 'The sheep is found! +15 HP and a new verse.' };
      case 'prodigal': return { gold: 35, learnVerse: true, text: 'The feast is yours. +35 gold, +1 verse.' };
      case 'sower_seed': return { learnVerse: true, text: 'You are good soil. You learn a verse.' };
      case 'good_samaritan': return { heal: 25, text: 'Compassion heals you. +25 HP.' };
      case 'talents': return { gold: 20 + game.floor * 5, text: `Your trading multiplies. +${20 + game.floor * 5} gold.` };
      case 'red_sea': return { revealMap: true, heal: 10, text: 'You cross on dry ground. +10 HP, path revealed.' };
      case 'fiery_furnace': return { buff: 'fire', shield: 15, text: 'The flame does not touch you. Fire verses +50%, +15 shield.' };
      case 'lions_den': return { combatBonus: 15, shield: 10, text: 'The lions will not touch you. +15 combat advantage, +10 shield.' };
      case 'great_flood': {
        if (RNG.random() < 0.5) return { heal: 20, revealMap: true, text: 'You ride the ark. +20 HP, map revealed.' };
        return { hpCost: 20, text: 'The deluge batters you. -20 HP.' };
      }
      case 'babel': return { revealSecret: true, gold: 10, text: 'The tower\'s secret is yours. +10 gold.' };
      case 'angel_appears': return { heal: 25, learnVerse: true, text: 'The angel\'s presence heals and teaches. +25 HP, +1 verse.' };
      case 'angel_fights': return { combatBonus: 20, text: 'The angel fights beside you. +20 combat advantage.' };
      case 'angel_truth': return { revealAll: true, revealMap: true, text: 'The angel reveals all: weaknesses and the map.' };
      case 'angel_blocks': return { buff: 'defense', text: 'The angel\'s guard steadies you. +2 defense.' };
      case 'true_form': return { revealWeakness: true, combatBonus: 10, text: 'You name its true form. Weakness exposed, +10 advantage.' };
      case 'demon_history': return { permanentKnowledge: true, revealMap: true, text: 'The dungeon\'s history is yours. Lasting knowledge, map revealed.' };
      case 'begs_death': return { heal: 15, learnVerse: true, text: 'You grant release. The soul\'s peace heals you. +15 HP, +1 verse.' };
      case 'forced_combat': return { startCombat: true, text: 'No choice — combat begins!' };
      case 'combat_condition': return { startCombat: true, condition: 'restricted', text: 'Combat begins under a condition!' };
      case 'combat_reward': return { startCombat: true, rewardOnWin: true, text: 'Combat begins — a reward waits on victory!' };
      case 'river_cross': {
        if (RNG.random() < 0.6) return { revealMap: true, text: 'You cross safely. Path revealed.' };
        return { hpCost: 10, text: 'The current bites. -10 HP.' };
      }
      case 'mountain_climb': {
        if (RNG.random() < 0.6) return { buff: 'defense', text: 'You summit. +2 defense.' };
        return { hpCost: 12, text: 'The climb costs you. -12 HP.' };
      }
      case 'desert_waste': {
        if (RNG.random() < 0.5) return { storeHeal: 10, text: 'You ration well. +10 stored.' };
        return { hpCost: 10, text: 'The waste drains you. -10 HP.' };
      }
      case 'frozen_lake': {
        if (RNG.random() < 0.5) return { text: 'You skate across cleanly!' };
        return { hpCost: 14, text: 'The ice breaks! -14 HP.' };
      }
      case 'volcanic_vent': return { buff: 'fire', hpCost: 8, text: 'You harness the heat. Fire +50%, -8 HP from the glow.' };
      case 'time_loop': return { learnVerse: true, text: 'You break the loop with a verse! +1 verse.' };
      case 'time_freeze': return { buff: 'defense', revealSecret: true, text: 'In the stillness you ready yourself. +2 defense, secret found.' };
      case 'past_vision': return { permanentKnowledge: true, text: 'The past is clear to you now. Lasting knowledge.' };
      case 'future_vision': return { revealMap: true, buff: 'wisdom', text: 'You prepare for what comes. Map revealed, wisdom grows.' };
      case 'deja_vu': return { random_positive_tag: true, heal: 5, text: 'You trust the feeling. +5 HP.' };
      case 'no_right': return { hpCost: 12, gold: -10, text: 'There was no clean answer. -12 HP, -10 gold spent.' };
      case 'both_cost': return { hpCost: 15, gold: -15, text: 'Both costs paid. -15 HP, -15 gold.' };
      case 'third_option': return { revealSecret: true, learnVerse: true, text: 'A hidden third way opens! Secret found, +1 verse.' };
      case 'secret_reward': return { learnVerse: true, gold: 25, text: 'The hidden room yields treasure. +25 gold, +1 verse.' };
      case 'demon_trade': return { gold: 30, hpCost: 10, text: 'Trade struck. +30 gold, -10 HP in fees.' };
      case 'unusual_goods': return { buff: 'attack', gold: -20, text: 'The curiosity empowers you. +3 attack, -20 gold.' };
      case 'bet_gold': {
        if (RNG.random() < 0.5) return { gold: 50, text: 'You win the wager! +50 gold.' };
        return { gold: -30, text: 'You lose the bet. -30 gold.' };
      }
      case 'dice_demon': {
        if (RNG.random() < 0.4) return { gold: 60, learnVerse: true, text: 'Snake eyes in your favor! +60 gold, +1 verse.' };
        return { gold: -25, hpCost: 5, text: 'The bones betray you. -25 gold, -5 HP.' };
      }
      case 'answer_riddle': return { learnVerse: true, gold: 20, text: 'Correct! The keeper yields a verse and 20 gold.' };
      case 'counter_praise': return { heal: 20, buff: 'defense', text: 'Your praise breaks the chorus. +20 HP, +2 defense.' };
      case 'join_chorus': return { hpCost: 20, text: 'You join the hellish song. -20 HP, something is taken.' };
      case 'choose_sacrifice': return { hpCost: 15, buff: 'attack', text: 'The altar takes its due. -15 HP, +4 attack.' };
      case 'free_soul': return { heal: 20, learnVerse: true, text: 'The soul goes free and blesses you. +20 HP, +1 verse.' };
      case 'leave_soul': return { text: 'You leave the soul bound. The dark thickens.' };
      case 'take_cursed': {
        if (RNG.random() < 0.5) return { buff: 'attack', hpCost: 15, text: 'The curse empowers and wounds. +5 attack, -15 HP.' };
        return { buff: 'fire', hpCost: 20, text: 'Cursed power surges. Fire +50%, -20 HP.' };
      }
      case 'refuse_cursed': return { buff: 'wisdom', text: 'You bless the item and refuse it. Wisdom grows.' };
      case 'temp_weapon': return { combatBonus: 25, buff: 'attack', text: 'The legendary weapon sings in your hand. +25 advantage, +3 attack.' };
      case 'verse_path': return { learnVerse: true, revealMap: true, text: 'The verse opens the way. +1 verse, map revealed.' };
      case 'wrong_verse': return { hpCost: 12, text: 'The wrong verse seals the path. -12 HP.' };
      case 'dark_ritual': return { buff: 'attack', hpCost: 20, text: 'Dark communion grants power. +5 attack, -20 HP.' };
      case 'refuse_ritual': return { buff: 'wisdom', text: 'You refuse the rite. Your faith deepens.' };
      case 'pilgrim_steps': return { heal: 20, learnVerse: true, permanentKnowledge: true, text: 'The pilgrimage completes you. +20 HP, +1 verse, lasting knowledge.' };
      case 'abandon_pilgrim': return { text: 'You abandon the path. The station falls silent.' };
      case 'faith_argued': return { buff: 'wisdom', learnVerse: true, text: 'You answer well. Wisdom grows, +1 verse.' };
      case 'doubt_sown': return { hpCost: 12, text: 'A seed of doubt takes root. -12 HP.' };
      case 'martyr_self': return { hpCost: game.maxHp, sacrificePower: true, permanentKnowledge: true, text: 'You give all. The reward is won at the cost of your life — great power, lasting knowledge.' };

      default: return { text: 'Something happens, but you cannot explain what.' };
    }
  },

  // ── GENERATE EVENT ────────────────────────────────────────
  // Floor gating keeps early floors readable; new categories phase in by depth.
  generate(floor, gameContext) {
    const floorGates = {
      npc: 1, trap: 1, temptation: 1, discovery: 1, moral: 1, puzzle: 1,
      treasure: 1, demon_talk: 1, shrine: 1, scroll: 1, hazard: 1,
      nemesis_hint: 1, lore: 1, ambush: 3, healing: 1, choir: 1,
      negotiate: 4, sacrifice: 1, map_event: 1, enemy_trick: 1, forsaken: 1, vision: 1,
      BOOK_OF_REVELATION: 6, MIRACLE: 3, TEMPTATION_OF_CHRIST: 4, PARABLES: 2,
      OLD_TESTAMENT: 2, ANGELIC_ENCOUNTERS: 3, DEMON_NATURE: 5, COMBAT_VARIANTS: 4,
      GEOGRAPHIC: 2, TEMPORAL: 6, MORAL_AMBIGUOUS: 5, HIDDEN_ROOM: 2,
      TRADER_DEMONS: 3, GAMBLING: 4, RIDDLE: 2, CHORUS_OF_HELL: 4,
      SACRIFICIAL_ALTAR: 3, LOST_SOULS: 5, CURSED_ITEM: 2, LEGENDARY_WEAPONS: 3,
      SCRIPTURE_WALK: 3, DARK_COMMUNION: 6, PILGRIMAGE: 4, WITNESS: 5, MARTYRDOM: 7,
    };

    // Weight templates by category and floor
    const eligible = this.templates.filter(t => {
      if ((floorGates[t.category] || 1) > floor) return false;
      if (t.category === 'nemesis_hint' && gameContext.nemesisEncounters < 1) return false;
      if (t.category === 'ambush' && floor < 3) return false;
      if (t.category === 'negotiate' && floor < 4) return false;
      return true;
    });

    // Weighted random selection
    const totalWeight = eligible.reduce((s, t) => s + t.weight, 0);
    let roll = RNG.random() * totalWeight;
    let template = eligible[0];
    for (const t of eligible) {
      roll -= t.weight;
      if (roll <= 0) { template = t; break; }
    }

    // Fill slots
    let text = template.text;
    const filledSlots = {};
    for (const [key, values] of Object.entries(template.slots || {})) {
      let val;
      if (typeof values === 'function') {
        val = values();
      } else {
        val = RNG.choice(values);
      }
      text = text.replace(`{${key}}`, val);
      filledSlots[key] = val;
    }

    // Resolve effects
    const resolvedChoices = template.choices.map(c => ({
      text: c.text,
      effect: this.resolveEffect(c.effect, gameContext),
      weight: c.weight,
    }));

    return {
      id: `event_${Date.now()}_${RNG.randint(0, 9999)}`,
      category: template.category,
      title: this.getCategoryTitle(template.category),
      text,
      choices: resolvedChoices,
    };
  },

  getCategoryTitle(cat) {
    const titles = {
      npc: 'Encounter',
      trap: 'Danger!',
      temptation: 'Temptation',
      discovery: 'Discovery',
      moral: 'Moral Choice',
      puzzle: 'Puzzle',
      treasure: 'Treasure',
      demon_talk: 'Dark Words',
      shrine: 'Sacred Ground',
      scroll: 'Ancient Scroll',
      hazard: 'Hazard',
      nemesis_hint: 'The Stalker',
      lore: 'Vision',
      ambush: 'Ambush!',
      healing: 'Restoration',
      choir: 'Heavenly Sound',
      negotiate: 'Deal',
      sacrifice: 'Sacrifice',
      map_event: 'Revelation',
      enemy_trick: 'Trap!',
      forsaken: 'Forsaken Place',
      vision: 'Divine Vision',
      BOOK_OF_REVELATION: 'Revelation',
      MIRACLE: 'Miracle',
      TEMPTATION_OF_CHRIST: 'The Wilderness',
      PARABLES: 'Parable',
      OLD_TESTAMENT: 'Of Old',
      ANGELIC_ENCOUNTERS: 'Angel',
      DEMON_NATURE: 'Demon\'s Nature',
      COMBAT_VARIANTS: 'Battle',
      GEOGRAPHIC: 'The Land',
      TEMPORAL: 'Time',
      MORAL_AMBIGUOUS: 'No Right Answer',
      HIDDEN_ROOM: 'Hidden Room',
      TRADER_DEMONS: 'Demon Market',
      GAMBLING: 'The Gamble',
      RIDDLE: 'Riddle',
      CHORUS_OF_HELL: 'Chorus of Hell',
      SACRIFICIAL_ALTAR: 'Altar',
      LOST_SOULS: 'Lost Soul',
      CURSED_ITEM: 'Cursed',
      LEGENDARY_WEAPONS: 'Relic',
      SCRIPTURE_WALK: 'The Word',
      DARK_COMMUNION: 'Dark Rite',
      PILGRIMAGE: 'Pilgrimage',
      WITNESS: 'Trial of Faith',
      MARTYRDOM: 'Martyrdom',
    };
    return titles[cat] || 'Event';
  },
};
