import {cheapestMenu} from '../src/screens/map/exploreLogic';
import type {Cafe} from '../src/app/domain';
test('all sizes selects a real cheapest option; exact sizes do not alias',()=>{
 const cafe:Cafe={id:'1',name:'행신',address:'',latitude:37,longitude:126,menus:[
  {id:'1',cafeId:'1',name:'아메리카노',size:'기본',temperature:'ICE',price:2000,caffeineMg:null,isDemo:true,priceScope:'STORE'},
  {id:'2',cafeId:'1',name:'아메리카노',size:'Tall',temperature:'ICE',price:4700,caffeineMg:null,isDemo:true,priceScope:'BRAND'},
 ]};
 expect(cheapestMenu(cafe,'아메리카노',null,'ICE')?.size).toBe('기본');
 expect(cheapestMenu(cafe,'아메리카노','Regular','ICE')).toBeNull();
 expect(cheapestMenu(cafe,'아메리카노','Tall','ICE')?.priceScope).toBe('BRAND');
});
