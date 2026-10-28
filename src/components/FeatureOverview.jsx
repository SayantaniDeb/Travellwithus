import FeatureImage from './FeatureImage';
import FeatureNavigation from './FeatureNavigation';
import { MapPin, CalendarDays, MessageCircle, Wallet, CloudSun, ClipboardList, Hotel, Heart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
const features=[
 {id:'planner',icon:MapPin,title:'A trip that starts with you.',name:'AI Trip Planner',description:'Choose a destination, set your dates and budget, and build an itinerary you can make your own.',route:'/plan-trip',action:'Start planning'},
 {id:'trips',icon:CalendarDays,title:'Your journeys, all together.',name:'Saved trips',description:'Keep routes, activities and stays in one place. Come back to a trip whenever inspiration strikes.',route:'/saved-trips',action:'Explore your trips'},
 {id:'community',icon:MessageCircle,title:'A world of shared experience.',name:'Travel community',description:'Find ideas from fellow travelers, ask a question, or share a story from your own adventure.',route:'/community',action:'Meet the community'},
 {id:'budget',icon:Wallet,title:'More memories. Fewer surprises.',name:'Budget tracker',description:'See your planning estimates and additional costs together, with a clear view of your trip budget.',route:'/budgets',action:'View your budgets'},
 {id:'weather',icon:CloudSun,title:'Ready for whatever the day brings.',name:'Weather updates',description:'Choose a city from the weather icon in your top bar and keep current conditions close at hand.',route:'/home?weather=1',action:'Check the weather'},
 {id:'checklist',icon:ClipboardList,title:'The essentials, taken care of.',name:'Trip checklists',description:'Give each journey its own checklist. Add the little things, check them off, and head out feeling prepared.',route:'/Todolist',action:'Open your lists'},
 {id:'hotels',icon:Hotel,title:'Somewhere you’ll love to return to.',name:'Find stays',description:'Explore stays around your destination and nightly budget, then save the places that feel right.',route:'/hotels',action:'Discover stays'},
 {id:'favorites',icon:Heart,title:'Keep the places that catch your eye.',name:'Saved stays',description:'Group your favorite hotels by trip and choose a tentative stay for your itinerary.',route:'/hotels?saved=1',action:'See saved stays'},
];
export default function FeatureOverview({signedIn}){
 return <section id="home-features" aria-label="TravelWithUs features" className="bg-white py-10 sm:py-16"><FeatureNavigation features={features}/><div className="mx-auto max-w-5xl pl-5 pr-16 sm:pl-8 sm:pr-16 xl:px-8">{signedIn ? <div className="mb-12 max-w-2xl sm:mb-16">
 <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Made for the way you travel</p>
 <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">Everything for your next journey.</h2>
 <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">From the first idea to the last stop, bring your plans, stays, budget, and travel essentials together.</p>
 <div aria-hidden="true" className="mt-6 h-1 w-12 rounded-full bg-blue-600" />
</div> : <div className="mb-12 flex flex-col gap-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-6 sm:mb-16 sm:flex-row sm:items-center sm:justify-between sm:p-8">
 <div className="min-w-0 max-w-xl">
  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-600">Start with a little wanderlust</p>
  <h2 className="font-serif text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">Your next adventure starts here.</h2>
  <p className="mt-3 text-sm leading-6 text-slate-600">Build your own itinerary and save it on this device without signing in. Sign in for AI-generated plans, community posts, and account backups.</p>
 </div>
 <Link to="/login" className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">Sign in to explore<ArrowRight size={16} aria-hidden="true"/></Link>
</div>}<div className="space-y-12 sm:space-y-20">{features.map((feature,index)=>{const Icon=feature.icon;const locked=!signedIn&&['budget','favorites','hotels'].includes(feature.id);return <article id={`feature-${feature.id}`} key={feature.id} className="grid items-center gap-8 px-1 sm:grid-cols-2 sm:gap-12"><div className={index%2?'sm:order-2':''}><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600"><Icon size={17} aria-hidden="true"/>{feature.name}</div><h2 className="font-serif text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{feature.title}</h2><p className="mt-4 max-w-md text-sm leading-7 text-slate-600">{feature.description}</p><Link to={locked?'/login':feature.route} className="mt-5 inline-flex items-center gap-2 rounded-md py-2 text-sm font-semibold text-blue-700 focus-visible:outline focus-visible:outline-blue-600">{locked?'Sign in to explore':feature.action}<ArrowRight size={16} aria-hidden="true"/></Link></div><FeatureImage src={`/features/${feature.id}.svg`} alt={`${feature.name} example with sample data`} width="482" height="300" loading="lazy" decoding="async" className={`feature-static-card w-full rounded-2xl ${index%2?'sm:order-1 feature-static-card-left':'feature-static-card-right'}`}/></article>;})}</div></div></section>;
}
