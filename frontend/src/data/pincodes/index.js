import maharashtra from './maharashtra.json';
import jharkhand from './jharkhand.json';
import karnataka from './karnataka.json';
import delhi from './delhi.json';
import westBengal from './westBengal.json';
import tamilNadu from './tamilNadu.json';
import telangana from './telangana.json';
import uttarPradesh from './uttarPradesh.json';
import bihar from './bihar.json';

// Merge all state aliases into a single map
const allAliases = {
  ...maharashtra,
  ...jharkhand,
  ...karnataka,
  ...delhi,
  ...westBengal,
  ...tamilNadu,
  ...telangana,
  ...uttarPradesh,
  ...bihar,
};

export default allAliases;
