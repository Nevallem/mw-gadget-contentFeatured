/**
 * Content featured (alpha version)
 * Creates and closes nominations to content featured in ptwikipdia
 *
 * @author [[pt:User:!Silent]]
 * @date 24/nov/2013
 * @update 13/aug/2020
*/
/* jshint laxbreak: true */
/* global $, jQuery, mw */

( function() {
'use strict';

mw.messages.set( {
	// General
	'cf-verifying': 'Verificando...',
	'cf-summarySufix': 'usando um [[MediaWiki:Gadget-contentFeatured.js|gadget]]',
	'cf-alertTitle': 'Aviso',

	// Buttons [general]
	'cf-button-cancel': 'Cancelar',
	'cf-button-OK': 'OK',
	'cf-button-next': 'Prosseguir',
	'cf-button-yes': 'Sim',
	'cf-button-no': 'Não',
	'cf-button-create': 'Criar',

	// Status [general]
	'cf-status-titlePrefix': 'Status',
	'cf-status-done': 'FEITO',
	'cf-status-finished': 'Finalizado',
	'cf-status-getContentPage': 'Obtendo o conteúdo da página "$1"',
	'cf-status-error': 'ERRO',
	'cf-status-unknownError': 'desconhecido',

	// Status [create]
	'cf-status-create-title': 'criando a candidatura',
	'cf-status-create-creatingPoll': 'Criando a página da votação',
	'cf-status-create-page': 'Adicionando a predefinição "\{\{Candidato a destaque/bom}}" na página "$1"',
	'cf-status-create-list': 'Adicionando a votação em "Wikipédia:Escolha do artigo em destaque/Lista"',

	// Status [close/general]
	'cf-status-close-title': 'encerrando a votação',
	'cf-status-close-discussion': 'Removendo a predefinição "\{\{candidato a destaque/bom}}" da discussão da página',
	'cf-status-close-poll': 'Alterando a predefinição "\{\{EAD não concluída}}" pela "\{\{Resultado EAD}}" em "$1"',
	'cf-status-close-list': 'Removendo a página da lista de candidaturas',

	// Status [close/normal]
	'cf-status-close-normal-addToRepoveList': 'Adicionando a página à lista de candidaturas reprovadas',

	// Create [general]
	'cf-create-new': 'Criar nova candidatura',
	'cf-create-pageName': 'Nome da página',
	'cf-create-argumentation': 'Argumentação',
	'cf-create-notExist': 'A página não existe',
	'cf-create-autorevRequires': 'Você precisa ser um <a href="/wiki/WP:AREV">autorrevisor</a> para apresentar uma nova candidatura.',
	'cf-create-abort': 'Deseja realmente cancelar?',
	'cf-create-editFail': 'Houve um problema entre as edições',
	'cf-create-success': 'A candidatura foi criada com sucesso',
	'cf-create-wait': 'A candidatura da página foi recusada a menos de trinta dias',
	'cf-create-alreadyExists': 'A candidatura para esta página já existe e está em andamento',
	'cf-create-archiving': 'Arquivando a votação anterior',
	'cf-create-alreadyFeatured': 'A página já está destacada.',
	'cf-create-alreadyGood': 'O artigo já é "bom".',

	// Create [type]
	'cf-create-type': 'Tipo da candidatura',
	'cf-create-type-0': 'Destaque',
	'cf-create-type-1': 'Bom',

	// Create [summary]
	'cf-create-summary-poll': 'Criação de uma nova candidatura para [[WP:artigo $1|artigo $1]] da página "[[$2]]"',
	'cf-create-summary-page': 'Adicionando a predefinição "\{\{Candidato a destaque}}"',
	'cf-create-summary-list': 'Adicionando a página "[[$1]]"',
	'cf-create-summary-archive': 'Arquivando a votação',

	// Close [general]
	'cf-close-title': 'Encerrar a votação',
	'cf-close-cantClose': 'Ainda não é possível fechar esta votação.',
	'cf-close-end': 'Finalizar',
	'cf-close-alreadyClosed': 'A votação já foi encerrada.',
	'cf-close-button': 'encerrar votação',
	'cf-close-action': 'Escolha uma ação',
	'cf-close-stop': 'Interromper',
	'cf-close-stopJustification': 'Justificativa',

	// Close [summary]
	'cf-close-summary-discussion': 'Removendo a predefinição "\{\{Candidato a destaque/bom}}"',
	'cf-close-summary-poll': 'Finalizando votação',
	'cf-close-summary-list': 'Retirando a página "[[$1]]" da lista',
	'cf-close-summary-addToRepoveList': 'Adicionando a página "$1" à lista'
} );

var cf,
	api = new mw.Api();

/**
 * @class ContentFeatured
 */
function ContentFeatured() {
	/**
	 * @property summarySufix
	 */
	this.summarySufix = ', ' + this.message( 'cf-summarySufix' );

	/**
	 * @property localStorage
	 */
	this.localStorage = ( typeof localStorage !== 'undefined' ) && localStorage;
}

ContentFeatured.prototype = {
	/**
	 * Messages
	 * @see [[mw:ResourceLoader/Default_modules#mediaWiki.message]]
	 * @return {string}
	 */
	message: function( /*name[, $1[, $2[, ... ]]]*/ ) {
		return mw.message.apply( this, arguments ).plain();
	},

	/**
	 * Refreshes or go to a page
	 * @param {string} [gotTo] page URL
	 * @return {undefined}
	 */
	refresh: function( goTo ) {
		if ( !goTo ) {
			location.reload();
		} else {
			location.href = goTo;
		}
	},

	/**
	 * Dialog used in the gadget
	 * @param {jQuery.dialog} info Dialog info
	 * @param {boolean} [notClose=false] Not closes the previous dialogs
	 * @return {undefined}
	 */
	dialog: function( info, notClose ) {
		var $cfDialog = $( '<div class="cf-dialog ui-widget"></div>' ).append( info.content );

		if ( $( '.cf-dialog' ).length && !notClose ) {
			$( '.cf-dialog' ).each( function() {
				$( this ).dialog( 'close' );
			} );
		}

		if ( !info.modal ) {
			info.modal = true;
		}

		$.extend( info, {
			open: function() {
				$( '.ui-dialog-titlebar-close' ).hide();
			},
			close: function() {
				$cfDialog.dialog( 'destroy' ).remove();
			}
		} );

		$cfDialog.dialog( info );
	},

	/**
	 * Alert prompt
	 * @param {string} text Text of warn
	 * @param {jQuery.dialog} [info] See "cf.dialog"
	 * @param {boolean} [notClose=false] See "cf.dialog"
	 * @return {undefined}
	 */
	alert: function( text, info, notClose ) {
		var infoDefault,
			buttons = {};

		buttons[ cf.message( 'cf-button-OK' ) ] = function() {
			$( this ).dialog( 'close' );
		};

		infoDefault = {
			title: cf.message( 'cf-alertTitle' ),
			content: text,
			dialogClass: 'cf-alert',
			width: 'auto',
			height: 'auto',
			buttons: buttons
		};

		if ( $.isPlainObject( info ) ) {
			$.extend( infoDefault, info );
		}

		cf.dialog( infoDefault, notClose );
	},

	/**
	 * Edit function
	 * @param {mediaWiki.messages} status Log that will be shown in status prompt
	 * @param {object} info Edit params
	 * @return {jQuery.Deferred}
	 * @see see [[mw:API:Edit]]
	 */
	editPage: function( status, info ) {
		var apiDeferred = $.Deferred(),
			edit = function( value ) {
				cf.status.log( status );

				if ( typeof info.text === 'function' ) {
					info.text = info.text( value );
				}

				if ( typeof info.getText !== 'undefined' ) {
					delete info.getText;
				}

				info.watchlist = 'preferences';
				info.summary = info.summary + cf.summarySufix;
				info.minor = true;
				info.done = {
					success: info.done,
					apiError: function ( errorName ) {
						cf.status.log( 'error', typeof errorName === 'object' ? errorName.code : errorName );
					},
					unknownError: function ( errorName ) {
						cf.status.log( 'error', cf.message( 'cf-status-unknownError' )  );
					}
				};

				api.editPage( info ).done( function() {
					apiDeferred.resolve();
				} );
			};

		// If "info.text" is set and is a function, gets the page content first
		// Set "info.getText" if you need get the content of another page other than "info.title"
		if ( typeof info.getText === 'string' || $.isFunction( info.text ) ) {
			cf.status.log( cf.message( 'cf-status-getContentPage', ( info.getText || info.title || mw.config.get( 'wgPageName' ).replace( /_/g, ' ' ) ) ) );
			api.getCurrentPageText( info.getText || info.title ).done( function( value ) {
				edit( value );
			} );
		} else {
			edit();
		}

		return apiDeferred.promise();
	},

	/**
	 * Gets the date of end of the poll
	 * @param {string} value Page text
	 * @param {boolean} [speedyClose=false] If is speed close
	 * @param {boolean} [UTCFormat=false] If is UTC format
	 * @return {number|string}
	 */
	getEndPoll: function( value, speedyClose, UTCFormat ) {
		var date =  /\d+ até [aà]s (.+\d+)/.exec( value.replace( /<section.+>\b/g, '' ) ),
			Months = {
				'janeiro': 'jan',
				'fevereiro': 'feb',
				'março': 'mar',
				'abril': 'apr',
				'maio': 'may',
				'junho': 'jun',
				'julho': 'jul',
				'agosto': 'aug',
				/*'setembro': 'sep',
				'outubro': 'oct',
				'novembro': 'nov',
				'dezembro': 'dec'*/ // FIXME temp
				'September': 'sep',
				'October': 'oct',
				'November': 'nov',
				'December': 'dec'
			};

		speedyClose = speedyClose || false;
		date = ( ( typeof date === 'string' ) ? date : ( ( date && date[ 1 ] ) || value ) )
			.replace( /(\'|de\b)/g, '' )
			.replace( /\s{2,}/g, ' ' )
			.replace( /(\d+?)[\:h](\d+)(min)? UTC/, '$1:$2' )
			.split( ' ' );
		date = [ date[ 1 ], Months[ date[ 2 ] ], date[ 3 ], date[ 0 ] ].join( ' ' ) + ' UTC';
		date = new Date( date ).getTime() - ( speedyClose ? 1296000000 : 0 ); // Speed close = -15 days

		if ( !UTCFormat ) {
			return date;
		} else {
			date = new Date( date );

			return date.toGMTString().split( ' ' )[ 4 ].replace( /(\d+):(\d+)\:\d+/, '$1h$2min' )
				+ ' ' + [ date.getDate() + ( date.getDate() === 1 ? 'º' : '' ), mw.config.get( 'wgMonthNames' )[ date.getMonth() + 1 ], date.getFullYear() ].join( ' de ' )
				+ ' UTC';
		}
	},

	/**
	 * Stats edits
	 * @param {string} type If is "create" or "close"
	 * @param {string} pageName page name
	 * @param {jQuery.Deferred} arguments The edits
	 * @example
		cf.run( 'create', pageName,
			cf.editPage( info ) [,
			cf.editPage( info ) [,
			cf.editPage( info ) [,
			...
		] ] ] );
	 * @return {undefined}
	 */
	run: function( type, pageName ) {
		var prefix = 'cf-' + type + '-';

		$.when.apply( this, Array.prototype.slice.call( arguments, 2 ) ).then( function() {
			cf.status.log( cf.message( 'cf-status-finished' ) );

			if ( cf.localStorage ) {
				cf.localStorage[ prefix + 'success' ] = true;
			}

			$( window ).off( 'beforeunload' );
			cf.refresh( mw.util.getUrl( 'Wikipédia:Escolha do artigo em destaque/' + pageName ) );
		}, function() {
			cf.alert( cf.message( prefix + 'editFail' ) );
		} );
	}
};

cf = new ContentFeatured();

/* Status */
cf.status = {};

/**
 * Writes a new log in the status prompt
 * @param {mediaWiki.messages} status Text of log
 * @param {string} [errorName] Error name
 * @return {undefined}
 */
 // FIXME status-done in wrong line
cf.status.log = function( status, errorName ) {
	var log = '',
		error = ( status === 'error' );

	if ( $( '#cf-status' ).html().lastIndexOf( '...' ) !== -1 ) {
		log += '<b>' + ( ( !error )
			? cf.message( 'cf-status-done' )
			: cf.message( 'cf-status-error' ) + ' (' + errorName + ')'
		) + log + '</b><br />';
	}

	if ( !error ) {
		log += status + ( ( status !== cf.message( 'cf-status-finished' ) ) ? '...' : '.' );
	}

	$( '#cf-status' ).append( log );
};

/**
 * Open the status prompt
 * @param {mediaWiki.messages} title Title of prompt
 * @return {undefined}
 */
cf.status.open = function( title ) {
	var buttons = {},
		cancelButton = function() {
			$( '.cf-dialog' ).eq( 0 ).dialog( 'close' );
			$( window ).off( 'beforeunload' );
		};

	buttons[ cf.message( 'cf-button-cancel' ) ] = function() {
		if ( $( this ).html().lastIndexOf( cf.message( 'cf-status-error' ) ) !== -1 ) {
			return cancelButton();
		}

		buttons.alertButtons = {};
		buttons.alertButtons[ cf.message( 'cf-button-yes' ) ] = function() {
			$( this ).dialog( 'close' );
			cancelButton();
		};
		buttons.alertButtons[ cf.message( 'cf-button-no' ) ] = function() {
			$( this ).dialog( 'close' );
		};

		cf.alert( cf.message( 'cf-create-abort' ), {
			modal: false,
			buttons: buttons.alertButtons
		}, true );
	};

	cf.dialog( {
		title: cf.message( 'cf-status-titlePrefix' ) + ': ' + title,
		content: '<div id="cf-status"><div>',
		width: '700px',
		buttons: buttons
	} );
};

/* Create a new poll */
cf.create = {};

/**
 * If something is wrong with the page
 * @param {mediaWiki.messages} msg If something is wrong with the page
 * @return {undefined}
 */
cf.create.isInvalid = function( msg ) {
	$( '#cf-create-page' ).addClass( 'cf-missing' ).val( '' );
	$( '#cf-create-page-status' ).addClass( 'cf-create-page-invalid' ).html( msg );

	delete cf.create.pageName;
};

/**
 * Executes if the page already been candidate previously
 * @param {string} value Text of the poll
 * @return {undefined}
 */
cf.create.alreadyExists = function( value ) {
	var currentDate = new Date().getTime(),
		endPoll = cf.getEndPoll( value ),
		type =  /\{\{Resultado EAD\|.+\|tipo=(\d)/.exec( value ),
		isAlreadyClosed = value.indexOf( '\{\{Candidatura interrompida|' ) !== -1 || value.indexOf( '\{\{Resultado EAD|data=' ) !== -1;

	// If already featured
	// FIXME And article was revalidated?
	if ( type ) {
		if ( type[ 1 ] === '1' ) {
			cf.create.isInvalid( cf.message( 'cf-create-alreadyFeatured' ) );
		} else if ( type[ 1 ] === '2' ) {
			cf.create.isInvalid( cf.message( 'cf-create-alreadyGood' ) );
		}
	}

	// If the candidature is open yet
	else if ( !isAlreadyClosed && ( endPoll > currentDate ) ) {
		cf.create.isInvalid( cf.message( 'cf-create-alreadyExists' ) );
	}

	// If the candidature was rejected to less of one month
	// FIXME test this
	else if ( isAlreadyClosed && ( ( value.indexOf( '=== \{\{Voto artigo destacado}} ===' ) !== -1 && ( endPoll + 2592000000 ) > currentDate )
		|| value.indexOf( '=== \{\{Voto artigo destacado}} ===' ) === -1 && ( cf.getEndPoll( value, true ) + 2592000000 ) > currentDate
	) ) {
		cf.create.isInvalid( cf.message( 'cf-create-wait' ) );
	}

	// Is OK to candidate again
	else {
		$( '#cf-create-page' ).removeClass( 'cf-missing' );
		$( '#cf-create-page-status' ).addClass( 'cf-create-page-OK' ).html( 'OK' );
	}
};

/**
 * The button "Criar" event
 * @return {undefined}
 */
cf.create.createButtonClick = function() {
	var $createType = $( 'input[name="cf-create-type"]' );

	$( '.cf-create-field' ).each( function() {
		if ( $( this ).val() === '' ) {
			$( this ).addClass( 'cf-missing' ).on( 'keypress', function() {
				if ( $( this ).val() !== '' ) {
					$( this ).removeClass( 'cf-missing' );
				}
			} );
		} else {
			$( this ).removeClass( 'cf-missing' );
		}
	} );

	if ( !$createType.eq( 0 ).prop( 'checked' ) && !$createType.eq( 1 ).prop( 'checked' ) ) {
		$( '#cf-create-type' ).addClass( 'cf-missing' );
		$createType.each( function() {
			$( this ).on( 'change', function() {
				if ( $( this ).val() !== '' ) {
					$( '#cf-create-type' ).removeClass( 'cf-missing' );
				}
			} );
		} );
	}

	if ( $( '#cf-create *' ).hasClass( 'cf-missing' ) ) {
		return;
	}

	cf.create.type = ( $( 'input[name="cf-create-type"]:checked' ).val() === '0' ) ? 'destaque' : 'bom';
	cf.create.argumentation = $( '#cf-create-argumentation' ).val();
	cf.create.pageName = $( '#cf-create-page' ).val();
	cf.create.run();
};

/**
 * Verify if the page exists, and if it was candidate previously
 * @param {jQuery} $el The button
 * @return {undefined}
*/
cf.create.verifyPage = function( $el ) {
	$el.removeClass( 'cf-missing' );
	$( '#cf-create-page-status' ).show().removeClass( 'cf-create-page-invalid cf-create-page-OK' ).html( cf.message( 'cf-verifying' ) );
	cf.create.verifyingStatus = 'processing';

	api.getCurrentPageText( $el.val() ).done( function( value ) {
		cf.create.pageName = $el.val();
		cf.create.verifyingStatus = 'done';

		if ( value !== undefined ) {
			api.getCurrentPageText( 'Wikipédia:Escolha do artigo em destaque/' + $el.val() ).done( function( value ) {
				if ( value !== undefined ) {
					cf.create.pollExist = true;
					cf.create.alreadyExists( value );
				} else {
					cf.create.pollExist = false;
					$el.removeClass( 'cf-missing' );
					$( '#cf-create-page-status' ).addClass( 'cf-create-page-OK' ).html( 'OK' );
				}
			} );
		} else {
			cf.create.isInvalid( cf.message( 'cf-create-notExist' ) );
		}
	} );
};

/**
 * Archives the previous poll, if it exists
 * @param {number} count Counter
 * @return {jQuery.Deferred}
 */
cf.create.archive = function( count ) {
	var page;

	if ( !count ) {
		count = 1;
		cf.create.apiDeferred = $.Deferred();
	}

	page = 'Wikipédia:Escolha do artigo em destaque/' + cf.create.pageName + '/' + count++;

	api.getCurrentPageText( page ).done( function( value ) {
		if ( value === undefined ) {
			api.post( {
				action: 'move',
				from: page.replace( /\/\d*$/, '' ),
				to: page,
				reason: cf.message( 'cf-create-summary-archive' ) + cf.summarySufix,
				token: mw.user.tokens.get( 'csrfToken' )
			} ).done( function() {
				cf.create.apiDeferred.resolve();
			} ).fail( function( errorName ) {
				cf.status.log( 'error', errorName );
			} );
		} else {
			cf.create.archive( count );
		}
	} );

	return cf.create.apiDeferred.promise();
};

/**
 * The creation prompt
 * @return {undefined}
 */
cf.create.prompt = function() {
	var buttons = {};

	buttons[ cf.message( 'cf-button-create' ) ] = function() {
		if ( cf.create.verifyingStatus === 'done' && ( !cf.create.pageName || cf.create.pageName === $( '#cf-create-page' ).val() ) ) {
			cf.create.createButtonClick( $( this ) );
		}
	};

	buttons[ cf.message( 'cf-button-cancel' ) ] = function() {
		$( this ).dialog( 'close' );
	};

	cf.dialog( {
		title: cf.message( 'cf-create-new' ),
		width: '675px',
		height: 'auto',
		content: '<div id="cf-create">' +
				'<label for="cf-create-page" class="cf-box">' +
					cf.message( 'cf-create-pageName' ) + ': <input type="text" id="cf-create-page" class="cf-create-field" /> ' +
					'<span id="cf-create-page-status"></span>' +
				'</label>' +
				'<div id="cf-create-type" class="cf-box">' +
					cf.message( 'cf-create-type' ) + ': ' +
					'<label>' +
						'<input type="radio" name="cf-create-type" value="0" />' + cf.message( 'cf-create-type-0' ) +
					'</label>' +
					'<label>' +
						'<input type="radio" name="cf-create-type" value="1" />' + cf.message( 'cf-create-type-1' ) +
					'</label>' +
				'</div>' +
				'<label for="cf-create-argumentation" class="cf-box">' + cf.message( 'cf-create-argumentation' ) + ': ' +
					'<textarea style="height:200px; width:100%" id="cf-create-argumentation" class="cf-create-field"></textarea>' +
				'</label>' +
			'</div>',
		buttons: buttons
	} );

	$( '#cf-create-page' )
		.val( $( '#cf-create-open input[type="text"]' ).val().split( '/' )[ 1 ] || '' )
		.blur( function() {
			if ( $.inArray( $( this ).val(), [ '', cf.create.pageName ] ) === -1 ) {
				cf.create.verifyPage( $( this ) );
			} else if ( $( this ).val() === '' ) {
				$( '#cf-create-page-status' ).hide();
			}
		} )
		.trigger( 'blur' );
};

/**
 * Realizes the edits
 * @return {undefined}
 */
cf.create.doEdits = function() {
	var pageName = cf.create.pageName;

	cf.run( 'create', pageName,
		cf.editPage( cf.message( 'cf-status-create-creatingPoll' ), {
			title: 'Wikipédia:Escolha do artigo em destaque/' + pageName,
			getText: 'Predefinição:EAD/Nova_votação',
			text: function( currentText ) {
				if  ( cf.create.type === 'bom' ) {
					currentText = currentText.replace( /(=== \{\{Voto artigo destacado}} ===(.|\n)*)(?=\=== \{\{Voto artigo bom}} ===)/, '' );
				} else {
					//currentText = currentText.replace( /\:\:Indicações para artigo bom.+\n/, '' ); #https://pt.wikipedia.org/w/index.php?diff=50949659&oldid=50949620
				}

				return currentText
					.replace(
						/\* Indicação para: [^\n]+/,
						'* Indicação para: artigo ' + cf.create.type + '\n\n' + cf.create.argumentation.trim()
					)
					.replace( /<\/?includeonly>/g, '' );
			},
			summary: cf.message( 'cf-create-summary-poll', cf.create.type, pageName )

		} ),
		cf.editPage( cf.message( 'cf-status-create-page', pageName ), {
			title: pageName,
			prependtext: '\{\{Candidato a ' + cf.create.type + '}}\n',
			summary: cf.message( 'cf-create-summary-page' )
		} ),
		cf.editPage( cf.message( 'cf-status-create-list' ), {
			title: 'Wikipédia:Escolha do artigo em destaque/Lista',
			text: function( currentText ) {
				return currentText.replace(
					/(!data-sort.+AB[.\n]+)([^\}]+)/,
					'$1\{\{#invoke:ECD|link|' + pageName + '}}\n$2'
				);
			},
			summary: cf.message( 'cf-create-summary-list', pageName )
		} )
	);
};

/**
 * Starts creation
 * @return {undefined}
 */
cf.create.run = function() {
	$( window ).on( 'beforeunload', function() {
		return true;
	} );

	cf.status.open( cf.message( 'cf-status-create-title' ) );

	if ( cf.create.pollExist ) {
		cf.status.log( cf.message( 'cf-create-archiving' ) );
		cf.create.archive().done( function() {
			cf.create.doEdits();
		} );
	} else {
		cf.create.doEdits();
	}
};

/* Close the poll */
cf.close = {};

/**
 * The closing prompt
 * @return {undefined}
 */
cf.close.prompt = function() {
	var $stopJustification,
		buttons = {};

	if ( mw.config.get( 'wgCategories' ).join( ',' ).search( /(rep|ap)rovadas/ ) !== -1 ) {
		cf.alert( cf.message( 'cf-close-alreadyClosed' ) );
		return;
	}

	buttons[ cf.message( 'cf-button-next' ) ] = function() {
		$stopJustification = $( '#cf-close-stopPoll-justification' );

		if ( $stopJustification.css( 'display' ) !== 'none' && $stopJustification.val() === '' ) {
			$stopJustification.addClass( 'cf-missing' ).on( 'keypress', function() {
				if ( $( this ).val() !== '' ) {
					$( this ).removeClass( 'cf-missing' );
				}
			} );
		}

		if ( $( 'input [nmae="cf-close-action"]' ).val() === 'stop' ) {
			cf.close.edits.stop();
		} else {
			cf.close.end.prompt();
		}
	};

	buttons[ cf.message( 'cf-button-cancel' ) ] = function() {
		$( this ).dialog( 'close' );
	};

	cf.dialog( {
		title: cf.message( 'cf-close-title' ),
		width: '500px',
		height: 'auto',
		content: '<div id="cf-close">'
				+ cf.message( 'cf-close-action' ) + ':'
				+ '<label class="cf-box"><input type="radio" name="cf-close-action" value="end" /> ' + cf.message( 'cf-close-end' ) + '</label>'
				+ '<label class="cf-box"><input type="radio" name="cf-close-action" value="stop" /> ' + cf.message( 'cf-close-stop' ) + '</label>'
				+ '<textarea id="cf-close-stopPoll-justification" placeholder="' + cf.message( 'cf-close-stopJustification' ) + '"></textarea>'
			+ '</div>',
		buttons: buttons
	} );

	$( 'input[name="cf-close-action"]' ).on( 'change', function() {
		if ( $( this ).val() === 'stop' ) {
			$stopJustification = $( '#cf-close-stopPoll-justification' );

			if ( $stopJustification.css( 'display' ) === 'none' ) {
				$stopJustification.show( 'slow' );
			} else {
				$stopJustification.hide( 'slow' ).val( '' );
			}
		} else {
			if ( $stopJustification instanceof jQuery ) {
				$stopJustification.hide( 'slow' ).val( '' );
			}
		}
	} );
};

/* Edits */
cf.close.edits = {};

/* Edits [Featured] */
cf.close.edits.featured = function() {
	/* Logic */
};

/* Edits [Good] */
cf.close.edits.good = function() {
	/* Logic */
};

/**
 * Edits [Normal]
 * @param {object} votes The votes of the poll
 * @return {undefined}
 */
cf.close.edits.normal = function( votes ) {
	var type,
		pageName = cf.close.pageName,
		date = new Date(),
		translateTypes = {
			'featured': 'destacado',
			'good': 'bom',
			'normal': 'normal'
		},
		result = ' (';

	for ( type in votes ) {
		if ( votes[ type ] ) {
			if ( votes[ type ] === '0' ) {
				result += 'nenhum';
			} else {
				result += votes[ type ];
			}

			result += ' voto' + ( ( votes[ type ] > 1 ) ? 's' : '' ) + ' para artigo ' + translateTypes[ type ];

			if ( type === 'normal' ) {
				break;
			}

			result += ( type === 'good' ) ? ' e ' : ', ';
		}
	}

	result += ') em ' + ( new Date() ).toLocaleString().replace( /.+, (.+)\s\d.+/ ,'$1' ) + ' (UTC)';

	/*cf.run( 'close', pageName,
		cf.editPage( cf.message( 'cf-status-close-poll', pageName ), {
			text: function( currentText ) {
				var currentDate = currentDate.toLocaleFormat().split( ', ' )[ 1 ].split( ' ' );

				currentDate.splice( 5, 1 ).concat( 'de', currentDate.splice( 0, 5 ), 'UTC' ).join( ' ' );
				return currentText
					.replace( /{{EAD não concluída.+/, '\{\{Resultado EAD|data=' +  + '}}' )
					.replace( /<!-- \{\{Resultado EAD\/2}}.+/, '\{\{Resultado EAD/2}}' );
			},
			summary: cf.message( 'cf-close-summary-poll' )
		} ),
		cf.editPage( cf.message( 'cf-status-close-discussion' ), {
			title: 'Talk:' + pageName,
			text: function( currentText ) {
				return currentText.replace( /\{\{Candidato a destaque\}\}/, '' );
			},
			summary: cf.message( 'cf-close-summary-discussion' )

		} ),
		cf.editPage( cf.message( 'cf-status-close-list' ), {
			title: 'Wikipédia:Escolha do artigo em destaque/Lista',
			text: function( currentText ) {
				return currentText.replace( new RegExp( '{{.+\/Link.' + pageName + '\\|.+\n' ), '' );
			},
			summary: cf.message( 'cf-close-summary-list', pageName )
		} ),
		cf.editPage( cf.message( 'cf-status-close-normal-addToRepoveList' ), {
			title: 'Wikipédia:Escolha do artigo em destaque/Candidaturas reprovadas ' + currentDate.getFullYear(),
			text: function( currentText ) {
				return currentText.replace(
					/(==.+==)\n/,
					'$1\n* [[Wikipédia:Escolha do artigo em destaque/' + pageName + '|]]' + result + '\n'
				);
			},
			summary: cf.message( 'cf-close-summary-addToRepoveList', pageName )
		} )
	);*/

	cf.editPage( cf.message( 'cf-status-close-poll', 'Wikipédia:Escolha do artigo em destaque/' + pageName ), {
		text: function( currentText ) {
			return currentText
				.replace(
					/{{EAD não concluída.+/,
					'\{\{Resultado EAD|data=' + cf.getEndPoll( currentText, ( cf.getEndPoll( currentText ) < new Date().getTime() && type === 'good' ), true ) + '}' + '}'
				)
				.replace( /<!-- \{\{Resultado EAD\/2}}.+/, '\{\{Resultado EAD/2}' + '}' );
		},
		summary: cf.message( 'cf-close-summary-poll' )
	} ).done( function() {
		cf.editPage( cf.message( 'cf-status-close-discussion' ), {
			title: 'Talk:' + pageName,
			text: function( currentText ) {
				return currentText.replace( /\{\{Candidato a destaque\}\}/, '' );
			},
			summary: cf.message( 'cf-close-summary-discussion' )

		} ).done( function() {
			cf.editPage( cf.message( 'cf-status-close-list' ), {
				title: 'Wikipédia:Escolha do artigo em destaque/Lista',
				text: function( currentText ) {
					return currentText.replace( new RegExp( '{{.+\/Link.' + pageName + '\\|.+\n' ), '' );
				},
				summary: cf.message( 'cf-close-summary-list', pageName )
			} ).done( function() {
				cf.editPage( cf.message( 'cf-status-close-normal-addToRepoveList' ), {
					title: 'Wikipédia:Escolha do artigo em destaque/Candidaturas reprovadas ' + date.getFullYear(),
					text: function( currentText ) {
						return currentText.replace(
							/(==.+==)\n/,
							'$1\n* [[Wikipédia:Escolha do artigo em destaque/' + pageName + '|]]' + result + '\n'
						);
					},
					summary: cf.message( 'cf-close-summary-addToRepoveList', pageName )
				} ).done( function() {
					cf.status.log( cf.message( 'cf-status-finished' ) );

					if ( cf.localStorage ) {
						cf.localStorage[ 'cf-close-success' ] = true;
					}

					$( window ).off( 'beforeunload' );
					cf.refresh( mw.util.getUrl( 'Wikipédia:Escolha do artigo em destaque/' + pageName ) );
				} );
			} );
		} );
	} );
};

/* Edits [stop] */
cf.close.edits.stop = function() {
	//cf.run( 'close', cf.close.pageName );
};

/* Ends the poll */
cf.close.end = {};

/**
 * Gets the votes of the poll
 * @param {string} text Page text
 * @return {object} The votes.
 */
cf.close.end.getVotes = function( text ) {
	var regex, vote,
		votes = {
			featured: /(=== \{\{Voto artigo destacado}} ===(.|\n)*)(?=\=== \{\{Voto artigo bom}} ===)/,
			good: /(=== \{\{Voto artigo bom}} ===(.|\n)*)(?=\=== \{\{Voto artigo normal}} ===)/,
			normal: /(=== \{\{Voto artigo normal}} ===(.|\n)*)(?=\== Comentários e sugestões ==)/
		};

	if ( cf.close.type === 'bom' ) {
		delete votes.featured;
	}

	for ( regex in votes ) {
		if ( votes[ regex ] ) {
			vote = votes[ regex ].exec( text )[ 0 ];
			votes[ regex ] = ( vote.search( /\n#/ ) !== -1 ) ? vote.split( /\n#[^:\n]/ ).length - 1 : '0';
		}
	}

	return votes;
};

/**
 * Gets the final result of the poll
 * @param {object} votes The votes
 * @param {boolean} [speedyClose] If speed close
 * @return {string} The result
 */
cf.close.end.getResult = function( votes, speedyClose ) {
	var result;

	if ( cf.close.type === 'bom' ) {
		result = ( votes.good >= ( speedyClose ? 5 : 7 ) && votes.good / ( votes.good + votes.normal ) >= 0.75 ) ? 'good' : 'normal';
	} else {
		if ( ( votes.featured + votes.good ) < 7 ) {
			result = 'normal';
		} else if ( ( votes.featured / ( votes.featured + votes.good + votes.normal ) ) >= 0.75 ) {
			result = 'featured';
		} else if ( ( ( votes.featured + votes.good ) / ( votes.featured + votes.good + votes.normal ) ) >= 0.75 ) {
			result = 'good';
		} else {
			result = 'normal';
		}
	}

	return result;
};

/**
 * Executes steps to close the poll
 * @return {undefined}
 */
cf.close.end.prompt = function() {
	var speedyCloseDate, speedyClose, endPoll, votes, currentTime,
		buttons = {};

	buttons[ cf.message( 'cf-button-cancel' ) ] = function() {
		$( this ).dialog( 'close' );
	};

	cf.alert( cf.message( 'cf-verifying' ), {
		width: '250px',
		buttons: buttons
	} );

	api.getCurrentPageText().done( function( value ) {
		cf.close.type = /\* Indicação para: artigo (.+)/.exec( value )[ 1 ];
		votes = cf.close.end.getVotes( value );
		endPoll = cf.getEndPoll( value );
		currentTime = new Date().getTime();

		if ( cf.close.type === 'bom' && ( endPoll > currentTime ) ) {
			speedyCloseDate = cf.getEndPoll( value, true );
			speedyClose = ( ( speedyCloseDate < currentTime ) && ( endPoll > currentTime ) ) && ( ( votes.good >= 5 ) || ( votes.normal === 0 ) );

			if ( ( speedyCloseDate > currentTime ) || !speedyClose  ) {
				cf.alert( cf.message( 'cf-close-cantClose' ) );
				return;
			}
		} else if ( endPoll > currentTime ) {
			cf.alert( cf.message( 'cf-close-cantClose' ) );
			return;
		}

		cf.close.pageName = mw.config.get( 'wgPageName' ).split( '/' )[ 1 ];
		cf.status.open( cf.message( 'cf-status-close-title' ) );
		cf.close.edits[ cf.close.end.getResult( votes, speedyClose ) ]( votes );
	} );
};

/**
 * Executes
 * @return {undefined}
 */
cf.init = function() {
	var pageName = mw.config.get( 'wgPageName' );

	if ( cf.localStorage && cf.localStorage[ 'cf-create-success' ] ) {
		mw.notify( cf.message( 'cf-create-success' ) );
		delete cf.localStorage[ 'cf-create-success' ];
	}

	if ( pageName === 'Wikipédia:Escolha_do_artigo_em_destaque' ) {
		$( '#cf-create-open input[type="submit"]' ).click( function( e ) {
			e.preventDefault();

			if ( $.inArray( 'autoreviewer', mw.config.get( 'wgUserGroups' ) ) === -1
				&& $.inArray( 'eliminator', mw.config.get( 'wgUserGroups' ) ) === -1
				&& $.inArray( 'sysop', mw.config.get( 'wgUserGroups' ) ) === -1
			) { // FIXME simplify this
				cf.alert( cf.message( 'cf-create-autorevRequires' ) );
				return;
			}

			cf.create.prompt();
		} );
	} else if ( pageName.search( /Wikipédia:Escolha_do_artigo_em_destaque\/.+/ ) !== -1 ) {
		$( 'h2' ).eq( 1 ).append(
			'<span class="mw-editsection">'
				+ '<span class="mw-editsection-bracket">[</span>'
				+ '<a id="cf-close-run">' + cf.message( 'cf-close-button' ) + '</a>'
				+ '<span class="mw-editsection-bracket">]</span>'
			+ '</span>'
		);

		$( '#cf-close-run' ).click( /*cf.close.prompt*/ cf.alert.on( cf, 'Recurso ainda não disponível.' ) );
	}
};

cf.init();

}() );
