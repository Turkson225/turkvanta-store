'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <div className="wrap inner-page empty-state"><h1>A little pause.</h1><p>We couldn't load this part of the store. Please try again.</p><button className="button" onClick={reset}>Try again</button><a href="mailto:turkinnovation@gmail.com">Contact the team</a></div>}
