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
 * Hungarian language functions
 *
 * @author Santhosh Thottingal
 */
( function ( $ ) {
	'use strict';

	$.i18n.languages.hu = $.extend( {}, $.i18n.languages[ 'default' ], {
		convertGrammar: function ( word, form ) {
			switch ( form ) {
				case 'rol':
					word += 'ról';
					break;
				case 'ba':
					word += 'ba';
					break;
				case 'k':
					word += 'k';
					break;
			}

			return word;
		}
	} );
}( jQuery ) );
