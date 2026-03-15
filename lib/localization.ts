import type {
  CharacterRecord,
  ConditionModifierTarget,
  InventoryPreset,
  OriginCulture,
  OriginSystem,
  TalentSource,
  Upbringing,
} from "@/lib/roster-types";
import type {
  GroupConcept,
  TeamCrewRole,
  TeamFactionStance,
  TeamNoteTag,
} from "@/lib/team-types";

import { i18n } from "@/lib/i18n";

type SkillKind = "general" | "advanced";

const originCultureLabels: Record<OriginCulture, string> = {
  firstcome: "Першоприбулі",
  zenithian: "Зенітці",
};

const originSystemLabels: Record<OriginSystem, string> = {
  algol: "Алгол",
  mira: "Міра",
  kua: "Куа",
  dabaran: "Дабаран",
  zalos: "Залос",
  other: "Інша система",
};

const upbringingLabels: Record<Upbringing, string> = {
  plebeian: "Плебейське",
  stationary: "Стаціонарне",
  privileged: "Привілейоване",
};

const conditionModifierTargetLabels: Record<ConditionModifierTarget, string> = {
  hitPoints: "Очки здоров'я",
  mindPoints: "Очки розуму",
  radiation: "Радіація",
};

const groupConceptLabels: Record<GroupConcept, string> = {
  Agents: "Агенти",
  Mercenaries: "Найманці",
  "Free Traders": "Вільні торговці",
  Pilgrims: "Паломники",
  Explorers: "Дослідники",
};

const talentSourceLabels: Record<TalentSource, string> = {
  group: "Груповий",
  concept: "Особистий",
  icon: "Іконний",
  other: "Інше",
};

const teamCrewRoleLabels: Record<TeamCrewRole, string> = {
  captain: "Капітан",
  engineer: "Інженер",
  pilot: "Пілот",
  sensorOperator: "Оператор сенсорів",
  gunner: "Стрілець",
};

const teamCrewRoleDescriptions: Record<TeamCrewRole, string> = {
  captain: "Голос командування, тактичний центр і публічне обличчя команди.",
  engineer: "Тримає корабель у строю, коли корпус, реактор або системи здають.",
  pilot: "Веде стрибки, маневри ухилення й усі посадки, після яких хочеться вижити.",
  sensorOperator: "Читає порожнечу, відстежує загрози й помічає те, що інші пропускають.",
  gunner: "Застосовує дисципліноване насильство, коли дипломатії вже не вистачає кисню.",
};

const teamFactionStanceLabels: Record<TeamFactionStance, string> = {
  ally: "Союзник",
  neutral: "Нейтрально",
  enemy: "Ворог",
};

const teamNoteTagLabels: Record<TeamNoteTag, string> = {
  mission: "Місія",
  npc: "NPC",
  faction: "Фракція",
  ship: "Корабель",
  mystery: "Таємниця",
  debt: "Борг",
  session: "Сесія",
};

const trustLevelLabels = [
  "Повний розрив",
  "Ворожість",
  "Настороженість",
  "Робочий контакт",
  "Довіра",
  "Внутрішнє коло",
] as const;

const inventoryLabelTranslations: Record<string, string> = {
  "5 m-doses": "5 м-доз",
  "10 blessed m-doses": "10 благословенних м-доз",
  "10 herbal remedies": "10 трав'яних засобів",
  "Accelerator pistol": "Акселераторний пістолет",
  "Advanced melee weapon": "Просунута зброя ближнього бою",
  "Advanced scope": "Просунутий приціл",
  "An assortment of fake identities": "Набір фальшивих особистостей",
  "Anonymous clothing": "Непримітний одяг",
  Arrash: "Арраш",
  "Armor-piercing ammo": "Бронебійні набої",
  "Beautiful (BIO)": "Вродливість (BIO)",
  "Blessed scripture": "Благословенне писання",
  Cásula: "Казула",
  "Command unit": "Командний модуль",
  Compass: "Компас",
  Computer: "Комп'ютер",
  "Com link V": "Ком-лінк V",
  "Communicator (II)": "Комунікатор (II)",
  "Communicator (III)": "Комунікатор (III)",
  "Communicator (IV)": "Комунікатор (IV)",
  "Communicator (V)": "Комунікатор (V)",
  Database: "База даних",
  "Custom gear": "Власне спорядження",
  "Custom tiny item": "Власна дрібничка",
  "Custom weapon": "Власна зброя",
  "Cybernetic muscles (CYB)": "Кібернетичні м'язи (CYB)",
  "Dura axe": "Дюра-сокира",
  "Dura knife": "Дюра-ніж",
  "Dura sword": "Дюра-меч",
  "Environment scanner": "Сканер середовища",
  "Exo loader": "Екзонавантажувач",
  "Exo shell": "Екзокостюм",
  "Exquisite clothing": "Вишуканий одяг",
  "Flight suit": "Льотний костюм",
  "Frag grenade": "Осколкова граната",
  "Hand fan": "Віяло",
  "Hand jet": "Ручний реактивний блок",
  "Heavy armor": "Важка броня",
  "Hyper rope": "Гіперканат",
  "Kambra (D6 doses)": "Камбра (D6 доз)",
  "Language modulator (CYB)": "Модулятор мови (CYB)",
  "Language unit": "Мовний модуль",
  "Lie detector (CYB)": "Детектор брехні (CYB)",
  Mask: "Маска",
  Medkit: "Меднабір",
  "Mechanical lockpick": "Механічна відмичка",
  "Mercurium dagger": "Меркурієвий кинджал",
  "Mercurium sword": "Меркурієвий меч",
  "Modulation mask": "Маска модуляції",
  "Musical instrument": "Музичний інструмент",
  Opor: "Опор",
  "Personal holograph": "Персональний голограф",
  "Portable lab": "Портативна лабораторія",
  "Power glove": "Силова рукавиця",
  "Pressure tent": "Герметичний намет",
  "Proximity sensor": "Датчик наближення",
  "Protective clothing": "Захисний одяг",
  "Rare collection of poems": "Рідкісна збірка поезії",
  "Recon drone": "Розвідувальний дрон",
  Reliquary: "Релікварій",
  "Security tablet": "Планшет безпеки",
  "Spare reload": "Запасне перезаряджання",
  "Standing reservation": "Постійне бронювання",
  "Stun gun": "Електрошокер",
  Tabak: "Табак",
  Tabula: "Табула",
  Talisman: "Талісман",
  "Talisman (Pilot +1)": "Талісман (Пілот +1)",
  "Targeting scope (CYB)": "Система наведення (CYB)",
  "Thermostatic suit": "Термостатичний костюм",
  Thurible: "Кадильниця",
  "Tools (Advanced)": "Інструменти (просунуті)",
  "Tools (Ordinary)": "Інструменти (звичайні)",
  "Transactor with 1,000 birr": "Транзактор із 1 000 біррів",
  "Vacuum sealer": "Вакуумний герметизатор",
  "Voice amplifier": "Підсилювач голосу",
  "Vulcan carbine": "Вулканічний карабін",
  "Vulcan carbine with sensor scope": "Вулканічний карабін із сенсорним прицілом",
  "Vulcan cricket": "Вулканічний крикет",
  "Weatherproof (CYB)": "Захист від негоди (CYB)",
  "Written prophecy": "Записане пророцтво",
  "Writing paraphernalia": "Письмове приладдя",
};

const inventoryCategoryTranslations: Record<string, string> = {
  Artist: "Митець",
  Armor: "Броня",
  Carbines: "Карабіни",
  Comms: "Зв'язок",
  "Data Spider": "Мережевик",
  Finance: "Фінанси",
  Flexible: "Гнучке",
  Fugitive: "Утікач",
  Melee: "Ближній бій",
  Negotiator: "Перемовник",
  Operative: "Оперативник",
  Pilot: "Пілот",
  Preacher: "Проповідник",
  Scientist: "Науковець",
  Sensors: "Сенсори",
  ShipWorker: "Корабельна робота",
  Sidearms: "Короткоствольна зброя",
  Soldier: "Солдат",
  Supplies: "Запаси",
  Survival: "Виживання",
  Technical: "Технічне",
  Thrown: "Метальна зброя",
  Trailblazer: "Першопроходець",
  Utility: "Утилітарне",
  Wardrobe: "Гардероб",
  "Ship Worker": "Корабельний працівник",
};

const inventoryCommentTranslations: Record<string, string> = {
  "A compact dose set for covert work": "Компактний набір доз для прихованої роботи.",
  "Aimed fire support optic": "Оптика для прицільної підтримки вогнем.",
  "Backups never hurt": "Запас ніколи не завадить.",
  "Beloved anthology": "Улюблена антологія.",
  "Biocode-locked spending account": "Витратний рахунок із біокодовим захистом.",
  "Blessed medicurgy doses": "Благословенні дози медикургії.",
  "Comfort item from the docks": "Річ для втіхи, привезена з доків.",
  "Conceal identity": "Допомагає приховати особу.",
  "Cosmetic biosculpting upgrade": "Косметичне біоскульптурне вдосконалення.",
  "Describe the item freely.": "Опишіть предмет у довільній формі.",
  "Expressive prop": "Виразний реквізит.",
  "Extra magazine or power cell": "Додатковий магазин або енергокомірка.",
  "False credentials, tags, and papers": "Фальшиві посвідчення, мітки та документи.",
  "Field analysis kit": "Набір для польового аналізу.",
  "Field shelter for hostile worlds": "Польове укриття для ворожих світів.",
  "Fill in the weapon details.": "Заповніть характеристики зброї.",
  "Forgettable, low-profile layers": "Непримітні шари одягу, що не запам'ятовуються.",
  "Formal clerical robes": "Офіційні ризи священнослужителя.",
  "Heavy, cell-powered": "Важка, з елементом живлення.",
  "Heavy-duty work glove": "Посилена робоча рукавиця.",
  "Industrial lifting exo": "Промисловий екзокостюм для підіймання вантажів.",
  "Ink, stylus, and vellum": "Чорнило, стилус і пергамент.",
  "Light": "Легка.",
  "Light, cell-powered": "Легка, з елементом живлення.",
  "Light, mercurium, cell-powered": "Легка, меркурієва, з елементом живлення.",
  "Lucky icon or reliquary": "Щаслива ікона або релікварій.",
  "Luxury stimulant doses": "Розкішні стимулювальні дози.",
  "Manual bypass for old locks": "Ручний обхід для старих замків.",
  "Medicurgy doses": "Дози медикургії.",
  "Mimetic-glass tablet": "Планшет із мімікричного скла.",
  "Patch exos and hull pinholes": "Латає екзокостюми й мікропробоїни корпусу.",
  "Pocket-sized or symbolic item.": "Кишеньковий або символічний предмет.",
  "Portable analysis kit": "Портативний набір для аналізу.",
  "Portable archive library database and reference": "Портативна бібліотека, база даних і довідковий архів.",
  "Portable holy text": "Портативний священний текст.",
  "Portable emergency medicurgy": "Портативна екстрена медикургія.",
  "Portable computing rig": "Портативний обчислювальний комплект.",
  "Portable holographic display": "Портативний голографічний дисплей.",
  "Portable library database and reference archive": "Портативна бібліотека, база даних і довідковий архів.",
  "Portable performance instrument": "Портативний інструмент для виступів.",
  "Portable translation support": "Портативна підтримка перекладу.",
  "Prestige booking on Coriolis": "Статусне бронювання на Коріолісі.",
  "Projects a synthetic disguise": "Створює синтетичне маскування.",
  "Protective icon or charm": "Захисна ікона або оберіг.",
  "Reliable personal communicator": "Надійний персональний комунікатор.",
  "Remote scouting support": "Віддалена підтримка розвідки.",
  "Security control and bypass slate": "Планшет для контролю безпеки й обходу систем.",
  "Serious battlefield protection": "Серйозний захист для поля бою.",
  "Short-range communicator": "Комунікатор малого радіуса.",
  Silent: "Безшумна.",
  "Scented luxury item": "Ароматний предмет розкоші.",
  "Specialized ammunition": "Спеціалізовані боєприпаси.",
  "Speech adaptation implant": "Імплант для адаптації мовлення.",
  "Specify the weapon name and mods.": "Уточніть назву зброї та модифікації.",
  Stun: "Оглушення.",
  "Standard work kit": "Стандартний робочий набір.",
  "Stabilizes body temperature": "Стабілізує температуру тіла.",
  "Subtle biometric tell-reader": "Непомітний біометричний зчитувач ознак.",
  "Survey local atmosphere and hazards": "Аналізує місцеву атмосферу та загрози.",
  "System-range communicator": "Комунікатор системного радіуса.",
  "System-range comm-link hardware": "Апаратний ком-лінк системного радіуса.",
  "Thrown explosive": "Метальний вибуховий пристрій.",
  "Traditional medicine kit": "Набір традиційної медицини.",
  "Tough multipurpose cable": "Міцний універсальний кабель.",
  "Vacuum and hostile-environment protection": "Захист від вакууму та ворожого середовища.",
  "Warns about nearby movement": "Попереджає про рух поблизу.",
  "Zero-G maneuver tool": "Інструмент для маневрування в невагомості.",
  "Officer's tactical command rig": "Тактичний командний комплект офіцера.",
  "Orbit-range communicator": "Комунікатор орбітального радіуса.",
  "Personal omen or revelation": "Особисте знамення або одкровення.",
  "Personal vice": "Особиста вада.",
  "Project authority across a room": "Дозволяє домінувати голосом у просторі.",
  "Advanced repair and diagnostic kit": "Просунутий набір для ремонту й діагностики.",
  "Adaptive weather hardening": "Адаптивний захист від погодних умов.",
  "Anonymous spending tag": "Анонімний платіжний тег.",
  "Augmented physical power": "Посилена фізична сила.",
  "Automatic fire": "Автоматичний вогонь.",
  "Automatic fire, sensor scope": "Автоматичний вогонь, сенсорний приціл.",
  "Blessed scripture": "Благословенне писання.",
  "Holy keepsake": "Священна реліквія.",
  "Incense burner": "Кадильниця.",
  "Low-profile protection": "Непомітний захист.",
  "Pilot-rated pressure layers": "Герметичні шари, сертифіковані для пілота.",
  "Written prophecy": "Записане пророцтво.",
};

function translateWithFallback(
  value: string,
  translations: Record<string, string>,
) {
  return translations[value] ?? value;
}

function isUkLanguage() {
  return (i18n.resolvedLanguage ?? i18n.language) === "uk";
}

export function getOriginCultureLabel(value: OriginCulture) {
  if (!isUkLanguage()) {
    return value === "firstcome" ? "Firstcome" : "Zenithian";
  }

  return originCultureLabels[value];
}

export function getOriginSystemLabel(value: OriginSystem) {
  if (!isUkLanguage()) {
    switch (value) {
      case "algol":
        return "Algol";
      case "mira":
        return "Mira";
      case "kua":
        return "Kua";
      case "dabaran":
        return "Dabaran";
      case "zalos":
        return "Zalos";
      case "other":
        return "Other";
    }
  }

  return originSystemLabels[value];
}

export function getUpbringingLabel(value: Upbringing) {
  if (!isUkLanguage()) {
    switch (value) {
      case "plebeian":
        return "Plebeian";
      case "stationary":
        return "Stationary";
      case "privileged":
        return "Privileged";
    }
  }

  return upbringingLabels[value];
}

export function getConditionModifierTargetLabel(value: ConditionModifierTarget) {
  if (!isUkLanguage()) {
    switch (value) {
      case "hitPoints":
        return "Hit Points";
      case "mindPoints":
        return "Mind Points";
      case "radiation":
        return "Radiation";
    }
  }

  return conditionModifierTargetLabels[value];
}

export function getGroupConceptLabel(value: GroupConcept) {
  if (!isUkLanguage()) {
    return value;
  }

  return groupConceptLabels[value];
}

export function getTalentSourceLabel(value: TalentSource) {
  if (!isUkLanguage()) {
    switch (value) {
      case "group":
        return "Group";
      case "concept":
        return "Personal";
      case "icon":
        return "Icon";
      case "other":
        return "Other";
    }
  }

  return talentSourceLabels[value];
}

export function getTeamCrewRoleLabel(value: TeamCrewRole) {
  if (!isUkLanguage()) {
    switch (value) {
      case "captain":
        return "Captain";
      case "engineer":
        return "Engineer";
      case "pilot":
        return "Pilot";
      case "sensorOperator":
        return "Sensor Operator";
      case "gunner":
        return "Gunner";
    }
  }

  return teamCrewRoleLabels[value];
}

export function getTeamCrewRoleDescription(value: TeamCrewRole) {
  if (!isUkLanguage()) {
    switch (value) {
      case "captain":
        return "Command voice, tactical anchor, and the crew's public face.";
      case "engineer":
        return "Keeps the ship alive when the hull, reactor, or systems complain.";
      case "pilot":
        return "Handles jumps, evasive maneuvers, and every landing worth surviving.";
      case "sensorOperator":
        return "Reads the void, tracks threats, and spots what others miss.";
      case "gunner":
        return "Brings disciplined violence when diplomacy runs out of oxygen.";
    }
  }

  return teamCrewRoleDescriptions[value];
}

export function getTeamFactionStanceLabel(value: TeamFactionStance) {
  if (!isUkLanguage()) {
    switch (value) {
      case "ally":
        return "Ally";
      case "neutral":
        return "Neutral";
      case "enemy":
        return "Enemy";
    }
  }

  return teamFactionStanceLabels[value];
}

export function getTeamNoteTagLabel(value: TeamNoteTag) {
  if (!isUkLanguage()) {
    switch (value) {
      case "mission":
        return "Mission";
      case "npc":
        return "NPC";
      case "faction":
        return "Faction";
      case "ship":
        return "Ship";
      case "mystery":
        return "Mystery";
      case "debt":
        return "Debt";
      case "session":
        return "Session";
    }
  }

  return teamNoteTagLabels[value];
}

export function getTrustLevelLabel(value: number) {
  if (!isUkLanguage()) {
    const englishTrustLevelLabels = [
      "Burn notice",
      "Hostile",
      "Wary",
      "Working contact",
      "Trusted",
      "Inner circle",
    ] as const;

    return (
      englishTrustLevelLabels[value] ??
      englishTrustLevelLabels[englishTrustLevelLabels.length - 1]
    );
  }

  return trustLevelLabels[value] ?? trustLevelLabels[trustLevelLabels.length - 1];
}

export function getAttributeLabel(
  value: Extract<keyof CharacterRecord, "strength" | "agility" | "wits" | "empathy">,
) {
  if (!isUkLanguage()) {
    switch (value) {
      case "strength":
        return "Strength";
      case "agility":
        return "Agility";
      case "wits":
        return "Wits";
      case "empathy":
        return "Empathy";
    }
  }

  switch (value) {
    case "strength":
      return "Сила";
    case "agility":
      return "Спритність";
    case "wits":
      return "Кмітливість";
    case "empathy":
      return "Емпатія";
  }
}

export function getSkillLabel(
  value: Extract<
    keyof CharacterRecord,
    | "dexterity"
    | "force"
    | "infiltration"
    | "manipulation"
    | "meleeCombat"
    | "observation"
    | "rangedCombat"
    | "survival"
    | "command"
    | "culture"
    | "dataDjinn"
    | "medicurgy"
    | "mysticPowers"
    | "pilot"
    | "science"
    | "technology"
  >,
) {
  if (!isUkLanguage()) {
    switch (value) {
      case "dexterity":
        return "Dexterity";
      case "force":
        return "Force";
      case "infiltration":
        return "Infiltration";
      case "manipulation":
        return "Manipulation";
      case "meleeCombat":
        return "Melee Combat";
      case "observation":
        return "Observation";
      case "rangedCombat":
        return "Ranged Combat";
      case "survival":
        return "Survival";
      case "command":
        return "Command";
      case "culture":
        return "Culture";
      case "dataDjinn":
        return "Data Djinn";
      case "medicurgy":
        return "Medicurgy";
      case "mysticPowers":
        return "Mystic Powers";
      case "pilot":
        return "Pilot";
      case "science":
        return "Science";
      case "technology":
        return "Technology";
    }
  }

  switch (value) {
    case "dexterity":
      return "Спритність рук";
    case "force":
      return "Силовий вплив";
    case "infiltration":
      return "Проникнення";
    case "manipulation":
      return "Маніпуляція";
    case "meleeCombat":
      return "Ближній бій";
    case "observation":
      return "Спостереження";
    case "rangedCombat":
      return "Дальній бій";
    case "survival":
      return "Виживання";
    case "command":
      return "Командування";
    case "culture":
      return "Культура";
    case "dataDjinn":
      return "Дата-джин";
    case "medicurgy":
      return "Медикургія";
    case "mysticPowers":
      return "Містичні сили";
    case "pilot":
      return "Пілотування";
    case "science":
      return "Наука";
    case "technology":
      return "Технології";
  }
}

export function getLocalizedInventoryPreset(preset: InventoryPreset): InventoryPreset {
  if (!isUkLanguage()) {
    return preset;
  }

  if (preset.kind === "weapon") {
    return {
      ...preset,
      label: translateWithFallback(preset.label, inventoryLabelTranslations),
      category: translateWithFallback(preset.category, inventoryCategoryTranslations),
      comments: translateWithFallback(preset.comments, inventoryCommentTranslations),
    };
  }

  return {
    ...preset,
    label: translateWithFallback(preset.label, inventoryLabelTranslations),
    category: translateWithFallback(preset.category, inventoryCategoryTranslations),
    comment: translateWithFallback(preset.comment, inventoryCommentTranslations),
  };
}

export function formatEncumbranceUnitsUk(units: number) {
  if (!isUkLanguage()) {
    if (units === 0) {
      return "Tiny";
    }

    if (units === 1) {
      return "Light";
    }

    if (units === 2) {
      return "Normal";
    }

    if (units === 4) {
      return "Heavy";
    }

    return `${units / 2} rows`;
  }

  if (units === 0) {
    return "Дрібне";
  }

  if (units === 1) {
    return "Легке";
  }

  if (units === 2) {
    return "Звичайне";
  }

  if (units === 4) {
    return "Важке";
  }

  return `${units / 2} рядки`;
}

export function describeSkillDicePoolUk(
  attributeValue: number,
  skillValue: number,
  kind: SkillKind,
) {
  if (!isUkLanguage()) {
    if (kind === "advanced" && skillValue === 0) {
      return "Needs 1 rank before it can be rolled.";
    }

    if (skillValue === 0) {
      return `Base chance ${attributeValue} dice from the attribute alone.`;
    }

    return `Pool ${attributeValue + skillValue} dice: ${attributeValue} attribute + ${skillValue} skill.`;
  }

  if (kind === "advanced" && skillValue === 0) {
    return "Потрібен щонайменше 1 ранг, щоб кидати цю навичку.";
  }

  if (skillValue === 0) {
    return `Базовий шанс: ${attributeValue} кубів лише від атрибута.`;
  }

  return `Пул ${attributeValue + skillValue} кубів: ${attributeValue} від атрибута + ${skillValue} від навички.`;
}

export function formatConditionModifierAppliedLabelUk(count: number) {
  if (!isUkLanguage()) {
    return count === 1 ? "1 modifier" : `${count} modifiers`;
  }

  const remainder10 = count % 10;
  const remainder100 = count % 100;

  if (remainder10 === 1 && remainder100 !== 11) {
    return `${count} модифікатор`;
  }

  if (remainder10 >= 2 && remainder10 <= 4 && (remainder100 < 12 || remainder100 > 14)) {
    return `${count} модифікатори`;
  }

  return `${count} модифікаторів`;
}

export function describeVarianceUk(actual: number, target: number) {
  if (!isUkLanguage()) {
    if (actual === target) {
      return "Aligned with the starter target.";
    }

    const delta = Math.abs(actual - target);
    return actual > target ? `${delta} above target.` : `${delta} below target.`;
  }

  if (actual === target) {
    return "Відповідає стартовому орієнтиру.";
  }

  const delta = Math.abs(actual - target);
  return actual > target ? `На ${delta} вище за орієнтир.` : `На ${delta} нижче за орієнтир.`;
}
