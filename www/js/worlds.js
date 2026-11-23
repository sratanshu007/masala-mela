/* Masala Mela: Swaad Bachao — world, piece and story data. (c) Deific Digital */
(function (G) {
  'use strict';

  // 6 ras (tastes) = 6 pieces
  const PIECES = [
    { key: 'jalebi',  ras: 'Meetha',  name: 'Jalebi',         en: 'Jalebi',        col: '#FF9F1C' },
    { key: 'imli',    ras: 'Khatta',  name: 'Imli Gola',      en: 'Tamarind Ball', col: '#8D5A2B' },
    { key: 'samosa',  ras: 'Namkeen', name: 'Samosa',         en: 'Samosa',        col: '#F4C430' },
    { key: 'mirchi',  ras: 'Teekha',  name: 'Mirchi Bhajiya', en: 'Chilli Fritter', col: '#E63946' },
    { key: 'thepla',  ras: 'Kadwa',   name: 'Methi Thepla',   en: 'Methi Thepla',  col: '#4CAF50' },
    { key: 'jamun',   ras: 'Kasaila', name: 'Kala Jamun',     en: 'Kala Jamun',    col: '#6A1B9A' }
  ];

  // scale = semitone offsets used for melody (Indian pentatonic raag flavours)
  const WORLDS = [
    { id: 1,  name: 'Chai Chowk',               main: '#FF8A3D', acc: '#1FB5A8', sky: ['#FFE9CF', '#FFB98A'], gimmick: 'fog',    boss: 'Kadwa Karela',  music: 'Chai ki Pyali',  bpm: 80,  root: 50, scale: [0, 2, 4, 7, 9],  inst: 'bansuri', path: 's' },
    { id: 2,  name: 'Mithai Gali',              main: '#FF5C8A', acc: '#FFC83D', sky: ['#FFE0EA', '#FF9DB8'], gimmick: 'jelly2', boss: 'Kadwa Karela',  music: 'Mithai ka Mela', bpm: 85,  root: 52, scale: [0, 2, 4, 7, 9],  inst: 'santoor', path: 's' },
    { id: 3,  name: 'Dhokla Dham',              main: '#F4D03F', acc: '#4DA3FF', sky: ['#E3F2FF', '#9FD0FF'], gimmick: 'dor',    boss: 'Kadwa Karela',  music: 'Patang Utsav',   bpm: 95,  root: 53, scale: [0, 2, 5, 7, 9],  inst: 'harmonium', path: 'zig' },
    { id: 4,  name: 'Punjab da Dhaba',          main: '#E8A317', acc: '#D7263D', sky: ['#FFF6C9', '#FFD36B'], gimmick: 'tawa',   boss: 'Kadwa Karela',  music: 'Dhaba Dhamaal',  bpm: 105, root: 50, scale: [0, 2, 4, 7, 10], inst: 'tumbi', path: 'zig' },
    { id: 5,  name: 'Kerala Backwaters',        main: '#2E9E5B', acc: '#3FB8C4', sky: ['#DDF7EC', '#8FDCC0'], gimmick: 'fog',    boss: 'Kadwa Karela',  music: 'Backwater Breeze', bpm: 75, root: 48, scale: [0, 2, 3, 7, 9],  inst: 'veena', path: 'river' },
    { id: 6,  name: 'Rajasthan Rangmahal',      main: '#E9B872', acc: '#C2185B', sky: ['#FFF0DA', '#F5C987'], gimmick: 'matka',  boss: 'Kadwa Karela',  music: 'Rangmahal Raag', bpm: 90,  root: 49, scale: [0, 1, 4, 7, 8],  inst: 'sarangi', path: 'spiral' },
    { id: 7,  name: 'Bengal Mishti Mela',       main: '#E63946', acc: '#F7F3E3', sky: ['#FFE5E2', '#FFA9A0'], gimmick: 'jelly2', boss: 'Kadwa Karela',  music: 'Mishti Mela',    bpm: 88,  root: 51, scale: [0, 2, 4, 7, 9],  inst: 'ektara', path: 'river' },
    { id: 8,  name: 'Hyderabad Biryani Bazaar', main: '#F59E0B', acc: '#047857', sky: ['#FFF3D6', '#FFCB6B'], gimmick: 'handi',  boss: 'Kadwa Karela',  music: 'Biryani Bazaar', bpm: 98,  root: 52, scale: [0, 3, 5, 7, 10], inst: 'sitar', path: 'spiral' },
    { id: 9,  name: 'Kashmir Kahwa Valley',     main: '#8EC5FC', acc: '#7C5CBF', sky: ['#EEF6FF', '#BFD9FF'], gimmick: 'ice',    boss: 'Kadwa Karela',  music: 'Kahwa Valley',   bpm: 70,  root: 47, scale: [0, 2, 4, 7, 9],  inst: 'santoor', path: 'hill' },
    { id: 10, name: 'Rasoi Mahal',              main: '#2B1B5A', acc: '#FFC83D', sky: ['#4B3690', '#1B0F3D'], gimmick: 'all',    boss: 'Fika Seth',     music: 'Rasoi Mahal',    bpm: 100, root: 50, scale: [0, 2, 4, 7, 9],  inst: 'orchestra', path: 'hill' }
  ];

  const WORLD_BEATS = {
    1:  'Meethi ka pehla safar. Dadi Maa sikhati hain ki match-3 ka jaadu Fika Fog ko kaise hatata hai.',
    2:  'Mithai Gali mein chashni jam gayi hai. Meethi sabko mithai se khush karegi.',
    3:  'Dhokla Dham ke patang! Fika ne patang ki dor se swaad baandh diya hai.',
    4:  'Punjab da Dhaba — sarson ke khet, bhangra wale truck, aur garam tawa ka khatra!',
    5:  'Kerala Backwaters par Fika Fog chhaya hai. Naav le chalo!',
    6:  'Rajasthan ke rangeen qile. Ras matkon mein chhupe hain.',
    7:  'Bengal Mishti Mela — rasgulla, dhaak, aur chipchipi chashni.',
    8:  'Hyderabad Biryani Bazaar. Dum handi ke dhakkan ke neeche kya hai?',
    9:  'Kashmir Kahwa Valley mein swaad barf ban gaya hai. Kahwa ki garmi se pighlao!',
    10: 'Rasoi Mahal — Fika Seth se aakhri muqabla!'
  };

  // Cutscenes. who: meethi | dabbu | dadi | seth | karela
  const SCENES = {
    intro: [
      { who: 'dadi',   t: 'Bahut pehle Rasoi Mahal mein chhah ras rehte the — meetha, khatta, namkeen, teekha, kadwa, kasaila.' },
      { who: 'seth',   t: 'Feeka hi theek hai! Maine saare swaad chura liye. Ha ha!' },
      { who: 'meethi', t: 'Arre! Ye purana tiffin to hil raha hai!' },
      { who: 'dabbu',  t: 'Namaste! Main Dabbu. Bhookh lagi hai!' },
      { who: 'dadi',   t: 'Beta, Fika Seth ne swaad chura liye hain. Teen ek jaise khaane milao — unka swaad Fika Fog ko hata dega.' },
      { who: 'meethi', t: 'To hum wapas laayenge. Chalo Dabbu!' }
    ],
    boss1: [
      { who: 'karela', t: 'Mera kadvapan... ye kaise ho gaya feeka?' },
      { who: 'meethi', t: 'Kadvapan bhi ek swaad hai, bas thoda kam lena hota hai!' },
      { who: 'dabbu',  t: 'Wah Meethi! Mujhe bhookh lagi!' }
    ],
    preFinale: [
      { who: 'seth',   t: 'Tum yahan tak aa gaye? Rasoi Mahal mera hai!' },
      { who: 'meethi', t: 'Seth ji, swaad sabka hai. Mela wapas lagega!' }
    ],
    finale: [
      { who: 'seth',   t: 'Feeka to sabse aasaan hota hai...' },
      { who: 'meethi', t: 'Par aasaan mein mazaa nahi aata, Seth ji.' },
      { who: 'seth',   t: '(muskurata hai) Mujhe nani ke haath ka halwa yaad aa gaya.' },
      { who: 'dabbu',  t: 'Sab milke bolo — Mela shuru karo!' }
    ]
  };

  const NAMES = {
    meethi: 'Meethi', dabbu: 'Dabbu', dadi: 'Dadi Maa', seth: 'Fika Seth', karela: 'Kadwe Karele'
  };

  // Tutorial tips shown by Dadi Maa when a new element is introduced.
  const TIPS = {
    1:  'Do paas wale khaane badlo taaki 3 ek jaise line mein aa jaayein.',
    2:  'Upar dikhaye khaane ikattha karo. Ginti neeche aayegi.',
    3:  '4 ek jaise ki line se Belan Blast banta hai — poori line saaf!',
    5:  'Chashni Jelly ke upar match karo, jelly saaf ho jaayegi.',
    6:  'T ya L shape banao — Kadhai Dhamaka do baar phatega!',
    8:  'Steel Tiffin ke paas 2 baar match karo, tab tootega.',
    9:  'Elaichi ko board ke sabse neeche tak pahunchao.',
    10: 'Fika Fog har chaal par failta hai! Uske paas match karke hatao.',
    16: '5 ek jaise ki line se Masala Dabba banta hai. Kisi bhi khaane se badlo!',
    31: 'Patang ki dor piece ko baandh deti hai. Us piece ka match banao.',
    46: 'Garam Tawa jab laal ho to toot-ta nahi. Thanda hone ka intezaar karo.',
    76: 'Mitti ka Matka 2 baar todna padta hai.',
    106:'Dum Handi ke dhakkan ke neeche ek Belan chhupa hai!',
    121:'Baraf mein jama piece hil nahi sakta. Paas mein match karo.'
  };

  G.MM_DATA = { PIECES, WORLDS, WORLD_BEATS, SCENES, NAMES, TIPS };
})(typeof window !== 'undefined' ? window : globalThis);
