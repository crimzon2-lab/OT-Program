/**
 * 語彙カテゴリ定義
 * ARCHITECTURE.md §10 準拠
 */

import type { VocabCategory, VocabCategoryId } from '../../types/schema';
import { VOCAB_CATEGORY_IDS } from '../../types/schema';

export { VOCAB_CATEGORY_IDS };

export const VOCAB_CATEGORIES: readonly VocabCategory[] = [
  {
    id: 'furniture',
    label: '家具・室内用品',
    hintPhrase: '部屋にある家具や敷物',
    findAllPhrase: '部屋にある家具や室内用品',
  },
  {
    id: 'kitchen',
    label: '台所用品・食器',
    hintPhrase: '台所や食事で使う道具',
    findAllPhrase: '台所や食事で使う道具',
  },
  {
    id: 'clothing',
    label: '衣類・身につけるもの',
    hintPhrase: '身につける衣服や履物',
    findAllPhrase: '身につける衣服や履物',
  },
  {
    id: 'food',
    label: '食材・料理・飲み物',
    hintPhrase: '食べ物や飲み物',
    findAllPhrase: '食べ物や飲み物',
  },
  {
    id: 'stationery',
    label: '文房具・日用小物',
    hintPhrase: '書斎や机で使う文房具',
    findAllPhrase: '書斎や机で使う文房具',
  },
  {
    id: 'vehicle',
    label: '乗り物・交通',
    hintPhrase: '人を乗せて運ぶ乗り物',
    findAllPhrase: '人を乗せて運ぶ乗り物',
  },
  {
    id: 'body',
    label: '身体部位・健康',
    hintPhrase: '人の体の部位や器官',
    findAllPhrase: '人の体の部位や器官',
  },
  {
    id: 'nature',
    label: '自然・天気・季節',
    hintPhrase: '空や季節などの自然現象',
    findAllPhrase: '空や季節などの自然現象',
  },
  {
    id: 'appliance',
    label: '家電・生活機器',
    hintPhrase: '電気で動く生活用の機械',
    findAllPhrase: '電気で動く生活用の機械',
  },
  {
    id: 'animal',
    label: '動物・生き物',
    hintPhrase: '野山や水辺にすむ生き物',
    findAllPhrase: '野山や水辺にすむ生き物',
  },
  {
    id: 'plant',
    label: '植物・花・樹木',
    hintPhrase: '庭や野に咲く植物や木',
    findAllPhrase: '庭や野に咲く植物や木',
  },
  {
    id: 'place',
    label: '場所・施設・建物',
    hintPhrase: '街の中にある施設や場所',
    findAllPhrase: '街の中にある施設や場所',
  },
];

export const VOCAB_CATEGORY_MAP: Readonly<Record<VocabCategoryId, VocabCategory>> =
  VOCAB_CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {} as Record<VocabCategoryId, VocabCategory>);
