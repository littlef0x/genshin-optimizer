import { CharacterData } from 'pipeline'
import ColorText from '../../../Components/ColoredText'
import { input, target } from "../../../Formula/index"
import { constant, equal, greaterEq, infoMut, percent, prod, unequal } from "../../../Formula/utils"
import KeyMap from '../../../KeyMap'
import { absorbableEle, CharacterKey, ElementKey } from '../../../Types/consts'
import { objectKeyMap } from '../../../Util/Util'
import { cond, stg, st } from '../../SheetUtil'
import CharacterSheet, { charTemplates, ICharacterSheet } from '../CharacterSheet'
import { dataObjForCharacterSheet, dmgNode } from '../dataUtil'
import assets from './assets'
import data_gen_src from './data_gen.json'
import skillParam_gen from './skillParam_gen.json'

const data_gen = data_gen_src as CharacterData
const key: CharacterKey = "Sucrose"
const elementKey: ElementKey = "anemo"
const ct = charTemplates(key, data_gen.weaponTypeKey, assets)

let a = 0, s = 0, b = 0, p1 = 0, p2 = 0
const datamine = {
  normal: {
    hitArr: [
      skillParam_gen.auto[a++], // 1
      skillParam_gen.auto[a++], // 2
      skillParam_gen.auto[a++], // 3
      skillParam_gen.auto[a++], // 4
    ]
  },
  charged: {
    dmg: skillParam_gen.auto[a++],
    stamina: skillParam_gen.auto[a++][0],
  },
  plunging: {
    dmg: skillParam_gen.auto[a++],
    low: skillParam_gen.auto[a++],
    high: skillParam_gen.auto[a++],
  },
  skill: {
    press: skillParam_gen.skill[s++],
    cd: skillParam_gen.skill[s++][0],
  },
  burst: {
    dot: skillParam_gen.burst[b++],
    dmg_: skillParam_gen.burst[b++],
    duration: skillParam_gen.burst[b++][0],
    cd: skillParam_gen.burst[b++][0],
    enerCost: skillParam_gen.burst[b++][0],
  },
  passive1: {
    eleMas: skillParam_gen.passive1[p1++][0],
    duration: skillParam_gen.passive1[p1++][0],
  },
  passive2: {
    eleMas_: skillParam_gen.passive2[p2++][0],
    duration: skillParam_gen.passive2[p2++][0],
  },
  constellation2: {
    durationInc: skillParam_gen.constellation2[0],
  },
  constellation6: {
    ele_dmg_: skillParam_gen.constellation6[0],
  }
} as const

const [condAbsorptionPath, condAbsorption] = cond(key, "absorption")
// A1 Swirl Reaction Element
const [condSwirlReactionPath, condSwirlReaction] = cond(key, "swirl")
// Set to "hit" if skill hit opponents
const [condSkillHitOpponentPath, condSkillHitOpponent] = cond(key, "skillHit")

// Conditional Output
const asc1Disp = greaterEq(input.asc, 1, datamine.passive1.eleMas)
const asc1 = unequal(target.charKey, key, // Not applying to Sucrose
  equal(target.charEle, condSwirlReaction, asc1Disp)) // And element matches the swirl
const asc4Disp = equal("hit", condSkillHitOpponent,
  greaterEq(input.asc, 4,
    prod(percent(datamine.passive2.eleMas_), input.premod.eleMas)))
const asc4 = unequal(target.charKey, key, asc4Disp)
const c6Base = greaterEq(input.constellation, 6, percent(0.2))

const c6Bonus = objectKeyMap(absorbableEle.map(ele => `${ele}_dmg_` as const), key =>
  equal(condAbsorption, key.slice(0, -5), c6Base))

export const dmgFormulas = {
  normal: Object.fromEntries(datamine.normal.hitArr.map((arr, i) =>
    [i, dmgNode("atk", arr, "normal")])),
  charged: {
    dmg: dmgNode("atk", datamine.charged.dmg, "charged")
  },
  plunging: Object.fromEntries(Object.entries(datamine.plunging).map(([key, value]) =>
    [key, dmgNode("atk", value, "plunging")])),
  skill: {
    press: dmgNode("atk", datamine.skill.press, "skill")
  },
  burst: {
    dot: dmgNode("atk", datamine.burst.dot, "burst"),
    ...Object.fromEntries(absorbableEle.map(key =>
      [key, equal(condAbsorption, key, dmgNode("atk", datamine.burst.dmg_, "burst", { hit: { ele: constant(key) } }))]))
  },
}

const nodeC3 = greaterEq(input.constellation, 3, 3)
const nodeC5 = greaterEq(input.constellation, 5, 3)
export const data = dataObjForCharacterSheet(key, elementKey, "mondstadt", data_gen, dmgFormulas, {
  bonus: {
    skill: nodeC3,
    burst: nodeC5,
  },
  teamBuff: {
    total: { eleMas: asc4 },
    premod: { ...c6Bonus, eleMas: asc1 },
  }
})

const sheet: ICharacterSheet = {
  key,
  name: ct.chg("name"),
  rarity: data_gen.star,
  elementKey,
  weaponTypeKey: data_gen.weaponTypeKey,
  gender: "F",
  constellationName: ct.chg("constellationName"),
  title: ct.chg("title"),
  talent: {  auto: ct.talentTem("auto", [{
        text: ct.chg("auto.fields.normal")
      }, {
        fields: datamine.normal.hitArr.map((_, i) => ({
          node: infoMut(dmgFormulas.normal[i], { name: ct.chg(`auto.skillParams.${i}`) }),
        }))
      }, {
        text: ct.chg("auto.fields.charged"),
      }, {
        fields: [{
          node: infoMut(dmgFormulas.charged.dmg, { name: ct.chg(`auto.skillParams.4`) }),
        }, {
          text: ct.chg("auto.skillParams.5"),
          value: datamine.charged.stamina,
        }],
      }, {
        text: ct.chg("auto.fields.plunging"),
      }, {
        fields: [{
          node: infoMut(dmgFormulas.plunging.dmg, { name: stg("plunging.dmg") }),
        }, {
          node: infoMut(dmgFormulas.plunging.low, { name: stg("plunging.low") }),
        }, {
          node: infoMut(dmgFormulas.plunging.high, { name: stg("plunging.high") }),
        }],
      }]),

      skill: ct.talentTem("skill", [{
        fields: [{
          node: infoMut(dmgFormulas.skill.press, { name: ct.chg(`skill.skillParams.0`) }),
        }, {
          text: ct.chg("skill.skillParams.1"),
          value: datamine.skill.cd,
          unit: "s"
        }, {
          canShow: (data) => data.get(input.constellation).value >= 1,
          text: st("charges"),
          value: 2
        }]
      }]),

      burst: ct.talentTem("burst", [{
        fields: [{
          node: infoMut(dmgFormulas.burst.dot, { name: ct.chg(`burst.skillParams.0`) }),
        }, {
          text: ct.chg("burst.skillParams.2"),
          value: data => data.get(input.constellation).value >= 2
            ? `${datamine.burst.duration}s + 2`
            : datamine.burst.duration,
          unit: "s"
        }, {
          text: ct.chg("burst.skillParams.3"),
          value: datamine.burst.cd,
          unit: "s"
        }, {
          text: ct.chg("burst.skillParams.4"),
          value: datamine.burst.enerCost,
        }]
      }, ct.condTem("burst", { // Absorption
        value: condAbsorption,
        path: condAbsorptionPath,
        name: st("eleAbsor"),
        states: Object.fromEntries(absorbableEle.map(eleKey => [eleKey, {
          name: <ColorText color={eleKey}>{stg(`element.${eleKey}`)}</ColorText>,
          fields: [{
            node: infoMut(dmgFormulas.burst[eleKey], { name: ct.chg(`burst.skillParams.1`) }),
          }]
        }]))
      }), ct.condTem("constellation6", { // Absorption teambuff for C6
        teamBuff: true,
        canShow: unequal(target.charKey, input.activeCharKey, 1),
        value: condAbsorption,
        path: condAbsorptionPath,
        name: st("eleAbsor"),
        states: Object.fromEntries(absorbableEle.map(eleKey => [eleKey, {
          name: <ColorText color={eleKey}>{stg(`element.${eleKey}`)}</ColorText>,
          fields: Object.values(c6Bonus).map(n => ({ node: n }))
        }]))
      }), ct.headerTem("constellation6", {
        canShow: unequal(condAbsorption, undefined, 1),
        fields: Object.values(c6Bonus).map(n => ({ node: n }))
      })]),

      passive1: ct.talentTem("passive1", [ct.condTem("passive1", {
        // Swirl Element
        teamBuff: true,
        value: condSwirlReaction,
        path: condSwirlReactionPath,
        name: st("eleSwirled"),
        // Hide for Sucrose
        canShow: unequal(input.activeCharKey, key, 1),
        states: Object.fromEntries(absorbableEle.map(eleKey => [eleKey, {
          name: <ColorText color={eleKey}>{stg(`element.${eleKey}`)}</ColorText>,
          fields: [{
            node: infoMut(asc1Disp, KeyMap.info("eleMas"))
          }, {
            text: stg("duration"),
            value: datamine.passive1.duration,
            unit: "s",
          }],
        }]))
      })]),
      passive2: ct.talentTem("passive2", [ct.condTem("passive2", {
        // Swirl element
        teamBuff: true,
        value: condSkillHitOpponent,
        path: condSkillHitOpponentPath,
        name: ct.ch("asc4"),
        canShow: unequal(input.activeCharKey, key, 1),
        states: {
          hit: {
            fields: [{
              node: infoMut(asc4Disp, KeyMap.info("eleMas")),
            }, {
              text: stg("duration"),
              value: datamine.passive2.duration,
              unit: "s"
            }],
          }
        }
      })]),
      passive3: ct.talentTem("passive3"),
      constellation1: ct.talentTem("constellation1"),
      constellation2: ct.talentTem("constellation2"),
      constellation3: ct.talentTem("constellation3", [{ fields: [{ node: nodeC3 }] }]),
      constellation4: ct.talentTem("constellation4"),
      constellation5: ct.talentTem("constellation5", [{ fields: [{ node: nodeC5 }] }]),
      constellation6: ct.talentTem("constellation6"),
    },
  }
export default new CharacterSheet(sheet, data, assets)
