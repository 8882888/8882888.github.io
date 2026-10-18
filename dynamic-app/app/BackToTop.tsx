'use client';
import {useEffect,useState} from 'react';
export default function BackToTop(){const [visible,setVisible]=useState(false);useEffect(()=>{const onScroll=()=>setVisible(window.scrollY>260);onScroll();window.addEventListener('scroll',onScroll,{passive:true});return ()=>window.removeEventListener('scroll',onScroll)},[]);return <button type="button" className="back-to-top" hidden={!visible} aria-label="맨 위로 이동" onClick={()=>window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}>↑ TOP</button>}
