import React from 'react';
import Renderer, {act} from 'react-test-renderer';
import {Button, TextInput} from 'react-native';
import MidtermTestScreen from '../src/screens/recommend/MidtermTestScreen';
import {midtermApi} from '../src/api/endpoints/midterm';
jest.mock('../src/api/endpoints/midterm', () => ({midtermApi: {
  search:jest.fn(), prepare:jest.fn(), confirm:jest.fn(),
}}));
jest.mock('react-native-safe-area-context', () => ({SafeAreaView:require('react-native').View}));
const result = {status:'RESULT',data_mode:'mock',notice:'임시 자료',recommendations:[
  {offer_id:'demo-1',cafe_id:'demo-a',cafe_name:'가상 매장',reason:'아메리카노 ICE M, 3000원'},
]};
test('chips search directly; text changes invalidate proposal; confirmation sends reviewed conditions', async () => {
  const constraints = {menu_code:'AMERICANO',temperature:'ICE',size:null,max_price_krw:4000,sort_by:'price',limit:10};
  const proposal = {status:'AWAITING_CONFIRMATION',proposal_id:'test-token',suggested_constraints:constraints,
    proposal:{evidence:{menu_code:'아메리카노'},unresolved:[]},extraction_mode:'mock'};
  (midtermApi.search as jest.Mock).mockResolvedValue(result);
  (midtermApi.prepare as jest.Mock).mockResolvedValue(proposal);
  (midtermApi.confirm as jest.Mock).mockResolvedValue(result);
  let tree!: Renderer.ReactTestRenderer;
  await act(async () => {tree=Renderer.create(<MidtermTestScreen />);});
  const press = async (title:string) => {await act(async () => {
    tree.root.findAllByType(Button).find(b=>b.props.title===title)!.props.onPress();
  });};
  try {
    await press('선택 조건 검색');
    expect(midtermApi.search).toHaveBeenCalledWith(constraints);
    expect(midtermApi.prepare).not.toHaveBeenCalled();
    await press('자연어 조건 준비');
    await act(async () => {tree.root.findByType(TextInput).props.onChangeText('수정한 요청');});
    expect(tree.root.findAllByType(Button).some(b=>b.props.title==='확인 후 추천')).toBe(false);
    await press('자연어 조건 준비');
    await press('5천 원 미만');
    await press('확인 후 추천');
    expect(midtermApi.confirm).toHaveBeenCalledWith('test-token',{...constraints,max_price_krw:4999});
    expect(JSON.stringify(tree.toJSON())).toContain('임시 자료');
  } finally {await act(async () => tree.unmount());}
});
