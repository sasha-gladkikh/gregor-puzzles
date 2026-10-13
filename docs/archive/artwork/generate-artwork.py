from pathlib import Path
from html import escape
import math

ROOT=Path(__file__).resolve().parent
OUT=ROOT
B='#0043fd';N='#0c063f';C='#00a9f2';T='#167f91';L='#c9d9e9';P='#e8efff';M='#51647b'
def text(x,y,s,size=19,color=N,anchor='start',weight=500):
 return f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" text-anchor="{anchor}" font-weight="{weight}">{escape(s)}</text>'
def box(x,y,w,h,fill=P,stroke=L,rx=12):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
def circle(x,y,r,fill=P,stroke=B):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
def path(d,stroke=B,width=4,fill='none',extra=''):return f'<path d="{d}" stroke="{stroke}" stroke-width="{width}" fill="{fill}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'
def arrow(x,y,x2,y2,color=B):return path(f'M{x} {y}L{x2} {y2}',color,3,extra='marker-end="url(#arrow)"')
def label(x,y,s):return text(x,y,s,17,M)
def write(num,title,caption,body):
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img"><title>{escape(title)}</title><defs><pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" stroke="#e9eef6" fill="none" stroke-width=".6"/></pattern><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="{B}"/></marker></defs><rect width="800" height="600" fill="#fbfcff"/><rect width="800" height="600" fill="url(#grid)"/><g font-family="Arial,Helvetica,sans-serif">{box(28,24,38,30,B,B,4)}{text(47,45,num,16,'white','middle',700)}{text(80,46,title.upper(),18,N,weight=700)}{body}{path('M30 544H770',L,1)}{text(30,574,caption,17,M)}{text(770,593,'CONCEPTUAL SCHEMATIC · NOT TO SCALE',11,M,'end')}</g></svg>'''
 (OUT/f'{num}.svg').write_text(svg)

# Preserve the reviewed two-pore architecture, recolored to the GSS palette.
original=(ROOT/'artwork.svg').read_text().replace('#8c1515',B).replace('#b44a4b','#668afa').replace('#006b81',T)
(OUT/'01.svg').write_text(original)

# Gap junctions: two cell membranes with paired channel halves.
b=box(30,100,318,410,'#edf4ff',L,22)+box(452,100,318,410,'#edf9fc',L,22)
b+=text(67,143,'Cell A',25,N,weight=700)+text(493,143,'Cell B',25,N,weight=700)
for x in [323,337,463,477]:
 for y in range(183,471,24):b+=circle(x,y,6,'#b9cdea','#7e99b7')
b+=box(286,273,114,92,B,B,15)+box(400,273,114,92,'#668afa',B,15)
b+=path('M290 319H510','#ffffff',32)+arrow(175,319,620,319)
for x in [133,227,561,666]:b+=circle(x,319,13,'#d8f3ff',T)
b+=text(400,233,'Paired channel halves',23,N,'middle',700)+path('M359 247L354 272',M,2)+path('M441 247L446 272',M,2)
b+=text(399,407,'Small molecules & ions',21,N,'middle')+text(400,484,'Direct exchange between neighboring cells',20,M,'middle')
write('02','Cell-to-cell communication','A channel bridges two cells.',b)

# Lysosomal transporter.
b=circle(283,305,176,'#edf4ff','#7d9bd0')+circle(283,305,158,'#f8fbff',L)
b+=text(283,145,'Lysosome',24,N,'middle',700)+text(574,141,'Cellular reuse',24,N,weight=700)
b+=path('M151 249q30-44 58 0t57 0t58 0',T,5)+label(143,217,'RNA / DNA breakdown')
for x,y in [(210,320),(294,291),(333,380),(203,400),(295,352)]:b+=box(x,y,25,23,'#b0dfff',T,5)
b+=box(427,272,68,93,B,B,15)+path('M423 317H500','white',27)+arrow(336,317,610,317)
for x,y in [(603,317),(667,270),(682,369)]:b+=box(x,y,25,23,'#b0dfff',T,5)
b+=text(484,430,'Membrane transporter',21,N,'middle')+path('M466 404V367',M,2)
b+=text(285,490,'Reusable nucleosides',20,M,'middle')+text(636,490,'Nucleosides',19,T,'middle')
write('03','Molecular recycling','Transport connects breakdown to reuse.',b)

# Ribosome assembly.
b+= ''
b=path('M100 278C75 167 137 133 237 164C325 140 370 216 333 278Z',B,3,'#cbdafe')
b+=text(216,223,'Large subunit',22,N,'middle',700)
b+=circle(267,291,30,'#d7eefa',T)+text(267,298,'eIF6',16,T,'middle',700)
b+=circle(373,207,25,'#e8f7fb',T)+label(340,157,'Maturation')+label(340,177,'factor')
b+=arrow(315,314,418,314)+circle(455,314,24,'#d7eefa',T)+text(455,320,'eIF6',14,T,'middle')+text(455,360,'Released',17,M,'middle')
b+=path('M493 227C493 173 541 160 580 187C627 160 676 183 674 227Z',T,3,'#d9edf5')+text(584,258,'Small subunit',20,N,'middle')
b+=arrow(213,329,257,405)+arrow(584,284,531,403)
b+=path('M250 463C230 376 306 365 395 392C477 363 552 387 529 463Z',B,3,'#cbdafe')
b+=path('M284 477C284 519 484 519 494 477Z',T,3,'#d9edf5')
b+=path('M156 470H626',T,4)+text(138,503,'RNA',17,T)+text(643,472,'Ready',19,N,weight=700)
write('04','Ribosome maturation','Prepare the subunits for protein synthesis.',b)

# Major spliceosome.
b=box(45,99,710,406,'#f5f8ff',L,25)+label(66,127,'NUCLEUS')
b+=text(82,174,'Pre-messenger RNA',23,N,weight=700)
b+=box(90,205,145,45,B,B,6)+box(565,205,145,45,C,C,6)
b+=path('M235 227C285 130 510 130 565 227',T,4)
b+=text(161,235,'Exon 1',18,'white','middle')+text(638,235,'Exon 2',18,N,'middle')+text(399,170,'Intron',18,T,'middle')
b+=box(278,263,248,91,'#e0e9ff','#b4c7ec',24)+text(402,294,'Major spliceosome',20,N,'middle',700)
b+=path('M323 321q12-17 24 0t24 0t24 0t24 0t24 0t24 0',T,3)+label(320,381,'Functional RNAs inside')
b+=arrow(244,293,221,418)+arrow(565,293,589,418)
b+=box(198,431,200,45,B,B,6)+box(398,431,201,45,C,C,6)+text(298,460,'Joined',20,'white','middle',700)+text(498,460,'exons',20,N,'middle',700)
write('05','RNA message processing','Remove an intron. Join the exons.',b)

# Calcium synapse.
b=box(40,95,720,210,'#ecf3ff',L,25)+text(69,132,'Presynaptic neuron',23,N,weight=700)
b+=box(40,418,720,94,'#ecf8fc',L,18)+text(64,497,'Neighboring neuron',21,N,weight=700)
b+=path('M60 301H745',B,8)+path('M60 423H745',T,7)
b+=box(186,275,82,54,B,B,10)+path('M225 273V331','white',23)+arrow(225,377,225,228)
b+=text(121,390,'Ca²+',21,T)+text(276,346,'Calcium entry',20,M)
for x,y in [(451,198),(585,172),(589,267)]:
 b+=circle(x,y,32,'#e4edff','#7b9ad3')
 for dx,dy in [(-9,-4),(10,-3),(0,12)]:b+=circle(x+dx,y+dy,4,C,T)
b+=path('M409 302q0-51 40-51q42 0 42 51',B,4)
for x,y in [(431,324),(462,355),(488,381),(407,367),(527,342)]:b+=circle(x,y,6,C,T)
b+=arrow(603,329,603,394)+text(626,368,'Release',19,M)
for x in [380,457,534]:b+=path(f'M{x} 441v-32h26v32',T,6)
b+=text(414,162,'Transmitter vesicles',20,N)+text(71,358,'Synaptic gap',18,M)
write('06','Synaptic communication','Calcium entry supports transmitter release.',b)

# Growth signaling.
b=box(44,117,712,60,'#e6effc',L,8)+text(65,155,'Cell membrane',20,M)
b+=path('M175 103v102m-24-91h48',B,9)+circle(175,84,11,C,T)
b+=arrow(181,213,240,269)+box(216,278,179,70,P,B,13)+text(305,309,'Regulatory',20,N,'middle')+text(305,333,'protein',20,N,'middle')
b+=arrow(409,312,480,312)+circle(537,312,45,'#d8f1fd',T)+text(537,319,'RAS',22,N,'middle',700)
b+=arrow(588,312,680,312)+box(641,380,107,54,P,B,8)+text(694,413,'MAPK',20,N,'middle',700)+arrow(694,322,694,370)
b+=box(108,399,398,105,'#eef3ff','#9eafd2',26)+text(139,433,'NUCLEUS',16,M,weight=700)+text(139,475,'Growth & developmental programs',19,N)
b+=arrow(625,411,519,450)+text(479,221,'A simplified signaling pathway',22,N,'middle')
write('07','Growth signal regulation','Signals help coordinate development.',b)

# Minor splicing pathway separate visual from round 5.
b=text(51,129,'Common intron pathway',23,M,weight=700)+box(51,153,144,42,'#8c9caf','#8c9caf',6)+path('M195 174q57-65 112 0',M,3)+box(307,153,144,42,'#8c9caf','#8c9caf',6)
b+=arrow(471,174,531,174)+box(553,153,177,42,'#c7d2df','#8c9caf',6)+text(643,179,'Joined exons',17,N,'middle')+label(145,225,'Major spliceosome')
b+=path('M48 265H752',L,2)
b+=text(51,311,'Specialist intron pathway',23,N,weight=700)+box(51,344,144,42,B,B,6)+path('M195 365q57-65 112 0',T,4)+box(307,344,144,42,C,C,6)
b+=arrow(471,365,531,365)+box(553,344,177,42,P,B,6)+text(643,370,'Joined exons',17,N,'middle')
b+=box(146,418,303,80,'#e6efff','#9db7ed',20)+text(297,450,'Minor spliceosome',23,N,'middle',700)+text(297,478,'Specialized functional RNAs',17,T,'middle')
b+=path('M253 411V392',T,3)+text(638,447,'A small class',20,M,'middle')+text(638,474,'of introns',20,M,'middle')
write('08','Specialist RNA processing','A different machine for a specialized intron.',b)

# Immune signal: qualitative pulse vs persistent.
b=box(40,101,721,74,'#eaf0ff',L,12)+text(69,132,'Internal membrane signaling',22,N,weight=700)+text(69,158,'Immune pathway → interferon response',18,M)
b+=text(51,227,'Regulated signal',22,N,weight=700)+text(51,384,'Sustained signal',22,N,weight=700)
for y in [306,468]:b+=path(f'M56 {y}H741',L,2)
b+=path('M58 290H159Q181 290 200 234Q221 195 242 253Q258 290 284 290H520',T,5)
b+=path('M58 450H158Q181 450 202 399L231 410L261 396L290 411L321 395L354 410L388 394L421 411L455 395L487 408L520 397',B,5)
b+=arrow(543,267,598,267)+box(621,227,133,71,'#e4f4f7',T,9)+text(687,258,'Response',18,N,'middle')+text(687,282,'settles',18,N,'middle')
b+=arrow(543,425,598,425)+box(621,388,133,76,P,B,9)+text(687,419,'Persistent',18,N,'middle')+text(687,444,'inflammation',17,N,'middle')
b+=label(60,511,'Illustrative signal patterns; no numerical measurements')
write('09','Immune signal regulation','Persistent signaling can sustain inflammation.',b)

# Intronic repeat expansion, counts explicitly symbolic.
b=text(46,124,'A repeated DNA sequence inside an intron',23,N,weight=700)
for y,n in [(178,4),(283,9)]:
 b+=box(45,y,115,42,B,B,5)+text(102,y+27,'Exon',19,'white','middle')+box(660,y,95,42,B,B,5)+text(707,y+27,'Exon',19,'white','middle')+path(f'M165 {y+21}H654',M,2)
 for j in range(n):b+=box(186+j*49,y+1,43,40,'#d5effc',T,4)+text(207+j*49,y+26,'GAA',13,N,'middle',600)
b+=text(45,254,'Longer repeat',20,N,weight=700)+text(187,359,'Repeat counts shown are symbolic, not diagnostic thresholds.',16,M)
b+=circle(378,456,31,P,B)+path('M349 449L280 411L237 429M280 411L265 385M351 471L296 495L271 478M399 434L453 397L482 414M408 463H525L555 439M525 463L555 489',B,4)
b+=text(70,448,'Neuronal',20,N)+text(70,477,'signaling',20,N)+arrow(574,456,711,456)
b+=path('M604 457l17-24 15 51 14-39 13 12',T,3)
write('10','Repeat expansions','A noncoding sequence can change in length.',b)
print('Created ten distinct scientific schematics in',OUT)
