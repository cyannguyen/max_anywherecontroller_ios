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
 * Bosnian (bosanski) language functions
 */
( function ( $ ) {
	'use strict';

	$.i18n.languages.bs = $.extend( {}, $.i18n.languages[ 'default' ], {
		convertGrammar: function ( word, form ) {
			switch ( form ) {
				case 'instrumental': // instrumental
					word = 's ' + word;
					break;
				case 'lokativ': // locative
					word = 'o ' + word;
					break;
			}

			return word;
		}
	} );

}( jQuery ) );
