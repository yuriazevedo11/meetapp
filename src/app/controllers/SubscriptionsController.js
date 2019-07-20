import { Op } from 'sequelize';
import { format } from 'date-fns';
import pt_BR from 'date-fns/locale/pt-BR';

import User from '../models/User';
import Meetup from '../models/Meetup';
import Subscription from '../models/Subscription';

import Mail from '../../lib/Mail';

class SubscriptionsController {
  async index(req, res) {
    const subscriptions = await Subscription.findAll({
      where: {
        user_id: req.userId,
      },
      attributes: {
        exclude: ['meetup_id'],
      },
      include: {
        model: Meetup,
        required: true,
        where: {
          date: {
            [Op.gte]: new Date(),
          },
        },
      },
      order: [[Meetup, 'date']],
    });

    return res.json(subscriptions);
  }

  async store(req, res) {
    const user = await User.findByPk(req.userId);
    const meetup = await Meetup.findByPk(req.params.meetupId, {
      include: [User],
    });

    if (meetup.user_id === user.id) {
      return res
        .status(400)
        .json({ error: 'Can not subscribe to your own meetups' });
    }

    if (meetup.past) {
      return res
        .status(400)
        .json({ error: 'Can not subscribe to past meetups' });
    }

    /**
     * User can not subscribe for the same meetup twice
     * or into two meetups at the same time
     */
    const checkDate = await Subscription.findOne({
      where: {
        user_id: user.id,
      },
      include: {
        model: Meetup,
        required: true,
        where: {
          date: meetup.date,
        },
      },
    });

    if (checkDate) {
      return res
        .status(400)
        .json({ error: 'Can not subscribe to two meetups at the same time' });
    }

    const subscription = await Subscription.create({
      user_id: user.id,
      meetup_id: meetup.id,
    });

    await Mail.sendMail({
      to: `${meetup.User.name} <${meetup.User.email}>`,
      subject: 'Inscrição realizada',
      template: 'subscription',
      context: {
        organizer: meetup.User.name,
        title: meetup.title,
        user: user.name,
        email: user.email,
        date: format(meetup.date, "'dia' dd 'de' MMMM', às' H:mm'h'", {
          locale: pt_BR,
        }),
      },
    });

    return res.json(subscription);
  }
}

export default new SubscriptionsController();
