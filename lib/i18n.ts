"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const languageStorageKey = "coriolis-language";
export const defaultLanguage = "uk";
export const supportedLanguages = ["en", "uk"] as const;
export type AppLanguage = (typeof supportedLanguages)[number];

const resources = {
  en: {
    translation: {
      common: {
        actions: {
          add: "Add",
          apply: "Apply",
          cancel: "Cancel",
          close: "Close",
          delete: "Delete",
          hide: "Hide",
          new: "New",
          open: "Open",
          remove: "Remove",
          rename: "Rename",
          save: "Save",
          showAll: "Show all",
        },
        language: {
          english: "ENG",
          ukrainian: "UA",
          label: "Language",
        },
        nav: {
          combat: "Combat",
          team: "Team",
          personalCombat: "Personal Combat",
          shipCombat: "Ship Combat",
          wholeCrew: "Whole Crew",
        },
        quickNav: {
          active: "Active section",
          label: "Quick Nav",
        },
        states: {
          none: "None",
          ready: "Ready",
          unknown: "Unknown",
        },
      },
      controls: {
        decreaseTo: "decrease to {{value}}",
        setTo: "set to {{value}}",
      },
      layout: {
        title: "Coriolis Dossier",
        description: "Interactive character and crew roster for Coriolis.",
      },
      combat: {
        page: {
          eyebrow: "Source-Faithful Extract",
          title: "Combat",
          description:
            "The English rules below follow the cheat sheet wording and structure as closely as possible, with a matching Ukrainian translation in the same layout.",
        },
        source: {
          sections: [
            {
              title: "COMBAT",
              entries: [
                {
                  text: "Roll one die for initiative.",
                },
                {
                  text: "On your turn, you have 3 Action Points (AP). Slow actions cost all 3 AP; normal actions cost 2 AP; and fast actions cost 1 AP.",
                  childrenStyle: "unordered",
                  children: [
                    {
                      text: "SLOW ACTIONS (3 AP): Firing an aimed shot; firing full auto; administering first aid; tinkering with a gadget; activating a mystical power.",
                    },
                    {
                      text: "NORMAL ACTIONS (2 AP): Attacking in close combat; firing a normal shot; reloading a weapon; ramming with a vehicle.",
                    },
                    {
                      text: "FAST ACTIONS (1 AP): Sprinting a short distance (typically 10m); taking cover; standing up; drawing a weapon; picking up an item; parrying; making an attack of opportunity in close combat; making a quick shot; going into overwatch; getting into, starting, or driving a vehicle.",
                    },
                    {
                      text: "FREE ACTIONS (0 AP): Using your armor against an attack; defending in an opposed roll; a quick shout to a comrade.",
                    },
                  ],
                },
                {
                  text: "Melee combat:",
                  childrenStyle: "unordered",
                  children: [
                    {
                      text: "With a successful attack, you inflict weapon damage. For each additional six, choose one bonus effect:",
                      childrenStyle: "unordered",
                      children: [
                        { text: "+1 damage (may choose multiple times)" },
                        {
                          text: "Inflict a critical injury. This costs extra sixes (beyond the first one) equal to the weapon’s Crit Rating.",
                        },
                        { text: "Deal 1 point of stress (may choose multiple times)" },
                        { text: "Raise your initiative score by 2 (may choose multiple times)" },
                        { text: "Make an enemy drop a weapon or hand-held item" },
                        { text: "Pin your enemy in a tight clinch." },
                      ],
                    },
                    {
                      text: "Defending against a melee attack is a fast reaction. Test Melee Combat. Each six allows you to choose an effect:",
                      childrenStyle: "unordered",
                      children: [
                        { text: "Neutralize one enemy 6." },
                        { text: "Perform an attack dealing weapon damage. You may not increase this." },
                        {
                          text: "Inflict a critical injury. This costs extra sixes (beyond the first one) equal to the weapon’s Crit Rating.",
                        },
                        { text: "Raise your initiative score by 2 (may choose multiple times)" },
                        { text: "Make an enemy drop a weapon or hand-held item after an attack." },
                      ],
                    },
                  ],
                },
                {
                  text: "Ranged combat:",
                  childrenStyle: "unordered",
                  children: [
                    {
                      text: "With a successful attack, you inflict weapon damage. For each additional six rolled, choose one bonus effect:",
                      childrenStyle: "unordered",
                      children: [
                        { text: "+1 damage (may choose multiple times)" },
                        {
                          text: "Inflict a critical injury. This costs extra sixes (beyond the first one) equal to the weapon’s Crit Rating.",
                        },
                        { text: "Deal 1 point of stress (may choose multiple times)" },
                        { text: "Raise your initiative score by 2 (may choose multiple times)" },
                        { text: "Make anenemy drop a weapon or other hand-held item." },
                      ],
                    },
                  ],
                },
                {
                  text: "Damage is not rolled; it is simply inflicted. Cover and Armor resist damage. Roll that value; each 6 reduces the damage.",
                },
              ],
            },
            {
              title: "SHIP COMBAT",
              ordered: true,
              entries: [
                {
                  text: "Order Phase (Captain) – COMMAND test. Give orders to crew members that will bestow bonuses if followed:",
                  childrenStyle: "ordered",
                  children: [
                    { text: "Repair! Grants a bonus to ship repairs (Phase 2)." },
                    {
                      text: "Evade! Grants a bonus to evasive maneuvers (Phase 3), and to attempts at breaking an enemy lock-on (Phase 4).",
                    },
                    { text: "Retreat! Grants a bonus to movement away from the enemy ship (Phase 3)." },
                    {
                      text: "Attack! Grants a bonus to movement towards an enemy ship (Phase 3), and to all attacks (Phase 5).",
                    },
                  ],
                },
                {
                  text: "Engineer Phase (Engineer) – Distribute the entire EP pool to all crew members, then you may perform a demanding TECHNOLOGY test for the following actions.",
                  childrenStyle: "ordered",
                  children: [
                    {
                      text: "Overload the Reactor - 0 EP – get extra EP per 6. The ship suffers 1 point of HP damage per extra EP generated. A failed roll means 1 point of HP damage.",
                    },
                    {
                      text: "Repair Hull Damage - 1 EP – restores Hull Points per 6. Requires one Ordinary spare part. Without a service station, you get a -2 to the roll.",
                    },
                    {
                      text: "Repair System Damage - 1 EP – restore lost EP per 6. Requires one Ordinary spare part. Without a service station, you get a -2 to the roll.",
                    },
                    {
                      text: "Repair Critical Damage - 1 EP – repairs one critical damage. Requires one Ordinary spare part. Without a service station, you get a -2 to the roll.",
                    },
                    {
                      text: "Repair System Damage - 1 EP – restores a disabled module. Requires one ordinary spare part. Without a service station, you get a -2 to the roll.",
                    },
                    { text: "Open an airlock - 1 EP – enables boarding when docked." },
                  ],
                },
                {
                  text: "Pilot Phase (Pilot) – The pilot can perform a variety of maneuvers, each one requiring a PILOT test. Each maneuver is modified by the Maneuverability of the ship. Each additional action after the first one gives a -2 to all actions.",
                  childrenStyle: "ordered",
                  children: [
                    { text: "Position - [Class of Ship] EP – Raise the initiative score per 6." },
                    { text: "Advance/Retreat - [Class of Ship] EP – Move one segment on the map." },
                    { text: "Evasive Maneuver - [Class of Ship] EP – A penalty to all attacks against the ship per 6." },
                    {
                      text: "Ramming - [Class of Ship] EP – Opposed pilot roll for the two pilots. It counts as an action for the attacker, but not for the defender. Both rolls are modified by the Maneuverability of the ships.",
                    },
                    {
                      text: "Boarding - [Class of Ship] EP – Opposed pilot roll modified by Maneuverability. The attacking pilot suffers a -2.",
                    },
                  ],
                },
                {
                  text: "Sensor Phase (Sensor operator) – The sensor operator can perform one of several key actions during a fight, all requiring DATA DJINN rolls.",
                  childrenStyle: "ordered",
                  children: [
                    {
                      text: "Target Lock - 1 EP – A positive modifier to attacks against per 6. The roll is modified by the Signature of the enemy ship. Other weapon systems can be used without a lock, but suffer a -2 modifier.",
                    },
                    {
                      text: "Breaking Target Lock - 1 EP – The roll is modified negatively by the strength of the enemy lock. A successful roll breaks the lock.",
                    },
                    {
                      text: "Pulse and Meme Attacks - 1 EP – Deal EP damage per 6. The roll is modified by the enemy’s Signature.",
                    },
                    {
                      text: "Disappear - 1 EP – End the combat. If the ship has a lock on it, the roll is modified negatively by the strength of the lock (the highest value in the case of multiple locks). The enemy ship may try to detect you again.",
                    },
                  ],
                },
                {
                  text: "Attack Phase (Gunner) – The gunner fires the ship’s weapon systems. The attack roll is a RANGED COMBAT test",
                  childrenStyle: "ordered",
                  children: [
                    {
                      text: "Fire Weapon Systems - 1 EP – Deal damage per 6. The attack is modified by the bonus of the weapon system and by the strength of the lock on the enemy ship. Firing without a target lock gives the gunner a -2 to the roll.",
                    },
                    {
                      text: "Launch a Torpedo - 1 EP – Requires a lock on the target. Torpedoes don’t hit their targets immediately – they approach them at a speed of 2 CU per turn.",
                    },
                    {
                      text: "Launch Mine - 0 EP – Places a mine in the segment where the ship is located. Roll a normal attack roll and note down the result, which represents how well placed the mine is. When any other ship moves into the segment, the attack from the mine is immediately triggered.",
                    },
                    {
                      text: "Defensive Fire - 1 EP – Destroy an incoming torpedo. The defensive fire replaces any offensive fire by the gunner in the same turn.",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
  },
  uk: {
    translation: {
      common: {
        actions: {
          add: "Додати",
          apply: "Застосувати",
          cancel: "Скасувати",
          close: "Закрити",
          delete: "Видалити",
          hide: "Сховати",
          new: "Нове",
          open: "Відкрити",
          remove: "Прибрати",
          rename: "Перейменувати",
          save: "Зберегти",
          showAll: "Показати все",
        },
        quickNav: {
          active: "Активний розділ",
          label: "Швидка навігація",
        },
        language: {
          english: "ENG",
          ukrainian: "UA",
          label: "Мова",
        },
        nav: {
          combat: "Бій",
          team: "Команда",
          personalCombat: "Звичайний бій",
          shipCombat: "Бій кораблів",
          wholeCrew: "Весь екіпаж",
        },
        states: {
          none: "Немає",
          ready: "Готово",
          unknown: "Невідомо",
        },
      },
      controls: {
        decreaseTo: "зменшити до {{value}}",
        setTo: "встановити {{value}}",
      },
      layout: {
        title: "Досьє Коріоліса",
        description: "Інтерактивний реєстр персонажів і команди для Coriolis.",
      },
      combat: {
        page: {
          eyebrow: "За текстом шпаргалки",
          title: "Бій",
          description:
            "Нижче — англійський текст майже слово в слово зі шпаргалки й український переклад у тій самій структурі.",
        },
        source: {
          sections: [
            {
              title: "БІЙ",
              entries: [
                {
                  text: "Кинь один кубик на ініціативу.",
                },
                {
                  text: "На своєму ході ти маєш 3 очки дій (AP). Повільні дії коштують усі 3 AP; звичайні — 2 AP; швидкі — 1 AP.",
                  childrenStyle: "unordered",
                  children: [
                    {
                      text: "ПОВІЛЬНІ ДІЇ (3 AP): Зробити прицільний постріл; стріляти чергою; надати першу допомогу; поратися з ґаджетом; активувати містичну силу.",
                    },
                    {
                      text: "ЗВИЧАЙНІ ДІЇ (2 AP): Атакувати в ближньому бою; зробити звичайний постріл; перезарядити зброю; піти на таран транспортом.",
                    },
                    {
                      text: "ШВИДКІ ДІЇ (1 AP): Пробігти коротку відстань (зазвичай 10 м); зайняти укриття; підвестися; вихопити зброю; підняти предмет; парирувати; зробити атаку нагоди в ближньому бою; зробити швидкий постріл; стати в режим спостереження; сісти в транспорт, завести його або кермувати ним.",
                    },
                    {
                      text: "ВІЛЬНІ ДІЇ (0 AP): Скористатися бронею під час атаки; захищатися у зустрічному кидку; швидко гукнути щось товаришеві.",
                    },
                  ],
                },
                {
                  text: "Ближній бій:",
                  childrenStyle: "unordered",
                  children: [
                    {
                      text: "Якщо атака влучила, ти завдаєш шкоди зброєю. За кожну додаткову шістку обери один бонусний ефект:",
                      childrenStyle: "unordered",
                      children: [
                        { text: "+1 шкоди (можна обрати кілька разів)" },
                        {
                          text: "Завдати критичного поранення. Це коштує додаткових шісток (понад першу) на величину Crit Rating зброї.",
                        },
                        { text: "Завдати 1 пункт стресу (можна обрати кілька разів)" },
                        { text: "Підвищити свою ініціативу на 2 (можна обрати кілька разів)" },
                        { text: "Змусити ворога випустити зброю або предмет із рук" },
                        { text: "Затиснути ворога в клінчі." },
                      ],
                    },
                    {
                      text: "Захист від атаки в ближньому бою — це швидка реакція. Зроби тест Melee Combat. Кожна шістка дає змогу обрати один ефект:",
                      childrenStyle: "unordered",
                      children: [
                        { text: "Нейтралізувати одну ворожу 6." },
                        { text: "Провести атаку, що завдає шкоди зброєю. Посилити її не можна." },
                        {
                          text: "Завдати критичного поранення. Це коштує додаткових шісток (понад першу) на величину Crit Rating зброї.",
                        },
                        { text: "Підвищити свою ініціативу на 2 (можна обрати кілька разів)" },
                        { text: "Після атаки змусити ворога випустити зброю або предмет із рук." },
                      ],
                    },
                  ],
                },
                {
                  text: "Дистанційний бій:",
                  childrenStyle: "unordered",
                  children: [
                    {
                      text: "Якщо атака влучила, ти завдаєш шкоди зброєю. За кожну додаткову шістку обери один бонусний ефект:",
                      childrenStyle: "unordered",
                      children: [
                        { text: "+1 шкоди (можна обрати кілька разів)" },
                        {
                          text: "Завдати критичного поранення. Це коштує додаткових шісток (понад першу) на величину Crit Rating зброї.",
                        },
                        { text: "Завдати 1 пункт стресу (можна обрати кілька разів)" },
                        { text: "Підвищити свою ініціативу на 2 (можна обрати кілька разів)" },
                        { text: "Змусити ворога випустити зброю або інший предмет із рук." },
                      ],
                    },
                  ],
                },
                {
                  text: "Шкоду не кидають окремо — її просто завдають. Укриття й броня поглинають шкоду. Кинь їхнє значення; кожна 6 зменшує шкоду.",
                },
              ],
            },
            {
              title: "БІЙ КОРАБЛІВ",
              ordered: true,
              entries: [
                {
                  text: "Фаза наказів (капітан) – тест COMMAND. Капітан віддає накази членам екіпажу; якщо їх виконати, вони дадуть бонуси:",
                  childrenStyle: "ordered",
                  children: [
                    { text: "Repair! Дає бонус до ремонту корабля (фаза 2)." },
                    {
                      text: "Evade! Дає бонус до ухильних маневрів (фаза 3), а також до спроб позбутися ворожого захоплення цілі (фаза 4).",
                    },
                    { text: "Retreat! Дає бонус до руху геть від ворожого корабля (фаза 3)." },
                    {
                      text: "Attack! Дає бонус до руху в бік ворожого корабля (фаза 3), а також до всіх атак (фаза 5).",
                    },
                  ],
                },
                {
                  text: "Фаза інженера (інженер) – Роздай увесь запас EP між членами екіпажу, а тоді можеш зробити складний тест TECHNOLOGY для таких дій.",
                  childrenStyle: "ordered",
                  children: [
                    {
                      text: "Перевантажити реактор - 0 EP – отримай додаткові EP за кожну 6. Корабель дістає 1 пункт шкоди HP за кожен додатково згенерований EP. Провалений кидок теж означає 1 пункт шкоди HP.",
                    },
                    {
                      text: "Полагодити пошкодження корпусу - 1 EP – відновлює Hull Points за кожну 6. Потрібна одна звичайна запасна деталь. Без сервісної станції ти отримуєш -2 до кидка.",
                    },
                    {
                      text: "Полагодити системні пошкодження - 1 EP – відновлює втрачені EP за кожну 6. Потрібна одна звичайна запасна деталь. Без сервісної станції ти отримуєш -2 до кидка.",
                    },
                    {
                      text: "Полагодити критичне ушкодження - 1 EP – усуває одне критичне ушкодження. Потрібна одна звичайна запасна деталь. Без сервісної станції ти отримуєш -2 до кидка.",
                    },
                    {
                      text: "Полагодити систему - 1 EP – відновлює вимкнений модуль. Потрібна одна звичайна запасна деталь. Без сервісної станції ти отримуєш -2 до кидка.",
                    },
                    { text: "Відкрити шлюз - 1 EP – дає змогу піти на абордаж, коли кораблі пришвартовані." },
                  ],
                },
                {
                  text: "Фаза пілота (пілот) – Пілот може виконувати різні маневри, і кожен із них вимагає тесту PILOT. На кожен маневр впливає маневреність корабля. Кожна додаткова дія після першої дає -2 до всіх дій.",
                  childrenStyle: "ordered",
                  children: [
                    { text: "Позиціонування - [Class of Ship] EP – Підвищити ініціативу за кожну 6." },
                    { text: "Просування / відступ - [Class of Ship] EP – Переміститися на один сегмент мапи." },
                    { text: "Ухильний маневр - [Class of Ship] EP – Дає штраф до всіх атак по кораблю за кожну 6." },
                    {
                      text: "Таран - [Class of Ship] EP – Зустрічний кидок пілотування для двох пілотів. Для нападника це вважається дією, для захисника — ні. На обидва кидки впливає маневреність кораблів.",
                    },
                    {
                      text: "Абордаж - [Class of Ship] EP – Зустрічний кидок пілотування з урахуванням маневреності. Пілот нападника отримує -2.",
                    },
                  ],
                },
                {
                  text: "Фаза сенсорів (оператор сенсорів) – Оператор сенсорів може виконати одну з кількох ключових дій під час бою; усі вони вимагають кидків DATA DJINN.",
                  childrenStyle: "ordered",
                  children: [
                    {
                      text: "Захоплення цілі - 1 EP – Дає позитивний модифікатор до атак за кожну 6. Кидок модифікується сигнатурою ворожого корабля. Інші системи зброї можна використовувати й без захоплення, але тоді вони отримують -2.",
                    },
                    {
                      text: "Зламати захоплення цілі - 1 EP – Кидок отримує негативний модифікатор від сили ворожого захоплення. Успішний кидок скидає захоплення.",
                    },
                    {
                      text: "Пульсові й меметичні атаки - 1 EP – Завдають шкоди EP за кожну 6. Кидок модифікується сигнатурою ворога.",
                    },
                    {
                      text: "Зникнути - 1 EP – Завершує бій. Якщо корабель уже в захопленні, кидок отримує негативний модифікатор від сили цього захоплення (або від найбільшого значення, якщо захоплень кілька). Ворожий корабель може спробувати знайти вас знову.",
                    },
                  ],
                },
                {
                  text: "Фаза атаки (канонір) – Канонір стріляє з корабельних систем озброєння. Кидок атаки — це тест RANGED COMBAT",
                  childrenStyle: "ordered",
                  children: [
                    {
                      text: "Відкрити вогонь із систем озброєння - 1 EP – Завдає шкоди за кожну 6. Атака модифікується бонусом системи озброєння і силою захоплення цілі на ворожому кораблі. Стрільба без захоплення цілі дає каноніру -2 до кидка.",
                    },
                    {
                      text: "Запустити торпеду - 1 EP – Потрібне захоплення цілі. Торпеди не влучають одразу — вони наближаються зі швидкістю 2 CU за хід.",
                    },
                    {
                      text: "Скинути міну - 0 EP – Розміщує міну в сегменті, де перебуває корабель. Зроби звичайний кидок атаки й запиши результат — він показує, наскільки вдало поставлена міна. Щойно будь-який інший корабель входить у цей сегмент, атака міни спрацьовує негайно.",
                    },
                    {
                      text: "Оборонний вогонь - 1 EP – Знищити вхідну торпеду. Оборонний вогонь замінює будь-який наступальний вогонь каноніра в тому ж ході.",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    },
  },
} as const;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: defaultLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export { i18n };
