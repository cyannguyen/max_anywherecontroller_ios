/*
 * Licensed Materials - Property of IBM
 *
 * 5725-M39
 *
 * (C) Copyright IBM Corp. 2020 All Rights Reserved
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with
 * IBM Corp.
 */

/**
 * Irish (Gaeilge) language functions
 */
( function ( $ ) {
	'use strict';

	$.i18n.languages.ga = $.extend( {}, $.i18n.languages[ 'default' ], {
		convertGrammar: function ( word, form ) {
			if ( form === 'ainmlae' ) {
				switch ( word ) {
					case 'an Domhnach':
						word = 'Dé Domhnaigh';
						break;
					case 'an Luan':
						word = 'Dé Luain';
						break;
					case 'an Mháirt':
						word = 'Dé Mháirt';
						break;
					case 'an Chéadaoin':
						word = 'Dé Chéadaoin';
						break;
					case 'an Déardaoin':
						word = 'Déardaoin';
						break;
					case 'an Aoine':
						word = 'Dé hAoine';
						break;
					case 'an Satharn':
						word = 'Dé Sathairn';
						break;
				}
			}

			return word;
		}
	} );
}( jQuery ) );
