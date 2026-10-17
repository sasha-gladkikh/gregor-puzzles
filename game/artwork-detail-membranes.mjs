// Contours traced from the approved 1448 × 1086 masters, normalized to 800 × 600.
// Surface passes are light reflections. Route passes follow existing arrows.
const path=d=>d.replace(/-?\d*\.?\d+/g,value=>(Number(value)*800/1448).toFixed(3));
const surface=(id,d,offset,duration=5200,color='#9ee7ff',width=3.6,target)=>({id,path:path(d),offset,duration,color,width,span:.24,type:'surface',...(target?{target}:{})});
const route=(id,d,offset,duration=3000,color='#ffe0a0')=>({...surface(id,d,offset,duration,color,3.5),type:'route',span:.28});

export const membraneArtworkDetails={
 '01':{period:15800,tracks:[
  surface('left-pore-fold','M617 243 C552 259 613 331 619 382 S598 499 594 596',0,5800),
  surface('left-inner-fold','M767 266 C807 321 714 341 707 415 S730 557 713 611',1700,5700),
  surface('right-pore-fold','M839 296 C802 331 856 379 845 438 S820 570 831 617',4400,6200),
  surface('right-outer-fold','M1002 304 C1044 371 969 403 955 463 S957 577 922 641',6100,6200),
  surface('bilayer-left','M0 68 C154 87 290 191 415 239 C463 258 498 269 533 273',9000,6000,'#c4ddff',3),
  surface('bilayer-right','M1070 380 C1195 423 1322 457 1448 488',10400,4900,'#c4ddff',3)
 ]},
 '02':{period:16600,tracks:[
  surface('left-channel-upper','M514 579 C559 548 572 609 622 613 S686 621 705 619',0,4300),
  surface('right-channel-upper','M747 619 C799 616 883 615 922 586',1900,4300,'#a8fff1'),
  route('junction-arrow-left','M585 669 L659 669',3400,2400),
  route('junction-arrow-right','M780 669 L836 669',5700,2200),
  surface('right-channel-lower','M742 722 C796 712 844 723 882 748',7200,4700,'#a8fff1'),
  surface('left-channel-lower','M511 746 C537 714 604 704 701 719',9300,4600),
  surface('upper-left-membrane','M247 18 C394 69 573 46 627 171 C641 204 653 226 649 245',11200,4500,'#c4ddff',3),
  surface('upper-right-membrane','M1100 5 C971 60 885 67 843 113 C799 158 788 197 789 245',12400,4000,'#b6fff6',3)
 ]},
 '03':{period:18100,tracks:[
  surface('lysosome-rna-upper','M588 249 C637 249 676 177 755 215 C827 244 815 333 936 311',0,5700,'#a7d4ff',3),
  surface('lysosome-rna-right','M1013 301 C1056 369 1045 419 1155 403 C1223 386 1246 449 1287 468',2300,5600,'#a7d4ff',3),
  surface('lysosomal-membrane','M665 112 C848 -22 1093 45 1238 199 C1331 299 1397 438 1384 566',5600,6300,'#b8dcff',3.5),
  surface('transporter-left-fold','M1034 664 C999 695 1058 726 1046 781 L1039 822',8700,4900),
  route('export-arrow','M1108 773 C1108 819 1118 849 1127 876',11100,3600),
  surface('transporter-right-fold','M1155 654 C1174 685 1134 721 1145 775 L1159 824',12900,4700)
 ]},
 '06':{period:16400,tracks:[
  surface('calcium-channel-left','M442 460 C404 480 458 520 444 582',0,4700),
  surface('vesicle-middle-rim','M684 302 C654 207 743 156 814 195 C876 229 878 300 837 339',1100,5700,'#e1eaff',3,'closed-vesicle-middle'),
  surface('vesicle-upper-rim','M958 200 C917 131 976 76 1032 82 C1094 88 1121 170 1064 217',6000,5500,'#e1eaff',3,'closed-vesicle-upper'),
  surface('vesicle-right-rim','M1164 352 C1117 285 1174 247 1216 251 C1276 255 1297 323 1254 365',9700,5200,'#e1eaff',2.8,'closed-vesicle-right'),
  route('calcium-entry-arrow','M499 659 L499 607',1000,2300,'#9bf8eb'),
  route('calcium-inner-arrow','M499 478 L499 383',2600,2600,'#9bf8eb'),
  surface('fused-vesicle-rim','M898 495 C823 363 1077 326 1090 447 C1093 477 1062 497 1050 533',4600,5800,'#d6e4ff',4.5),
  route('release-arrow','M986 556 L986 607',8000,2400),
  surface('receptor-left-rim','M728 822 C689 835 734 876 730 919 L724 962',9900,4900,'#9cfff2'),
  surface('receptor-right-rim','M810 821 C844 840 796 880 800 916 L809 961',11500,4700,'#9cfff2'),
  surface('postsynaptic-membrane','M40 914 C198 859 252 880 349 894 C472 912 584 899 677 911',13200,3000,'#b7fff3',3)
 ]},
 '07':{period:17600,tracks:[
  surface('receptor-fold','M254 125 C229 161 279 176 286 224 L288 378',0,4000),
  route('receptor-response','M404 310 Q455 319 480 353',2200,2200),
  surface('regulator-fold','M593 315 C532 310 543 362 504 380 C463 410 489 440 534 444 C559 451 562 470 590 467',3300,4300),
  route('regulator-to-ras','M700 341 C748 311 796 276 844 292',5500,2300),
  route('ras-to-cascade','M1021 308 Q1064 338 1064 391',7400,1900),
  surface('cascade-fold','M1026 456 C1041 414 1082 435 1101 416 C1128 388 1146 415 1153 440',8500,2900,'#b8deff',3.6,'cascade-blue-protein'),
  route('cascade-relay','M1064 511 Q1074 548 1084 582',10200,1700),
  route('cascade-output','M1062 706 Q1063 742 1045 765',12200,1700),
  route('nuclear-response','M920 856 C843 894 767 814 690 853',14300,2700)
 ]},
 '09':{period:18500,tracks:[
  surface('er-membrane-fold','M15 57 C182 96 318 22 336 73 C371 143 222 121 270 145 C364 149 519 91 550 151 C581 200 467 214 403 217',0,5200,'#b6dfff',3),
  route('carrier-departure','M485 342 Q531 317 580 317',3100,2300,'#adceff'),
  route('carrier-arrival','M785 331 Q832 348 873 351',5700,2200,'#adceff'),
  surface('golgi-rim','M833 146 C770 154 852 207 935 218 C1082 246 1229 262 1320 264 C1364 265 1325 223 1376 206',6800,5600,'#affff0',4),
  route('golgi-response','M1063 414 Q1082 456 1081 496',9300,2100),
  route('protein-relay','M1079 622 L1068 677',11200,1900),
  route('nuclear-entry','M1036 798 C948 894 861 907 774 892',13400,2600),
  surface('rna-product','M442 882 C503 831 500 949 593 892 C625 872 646 873 663 883',15100,2900,'#ffe6a6',2.8)
 ]}
};
