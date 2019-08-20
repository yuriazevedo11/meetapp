import Meetup from '../models/Meetup';

import File from '../models/File';

class OrganizingController {
  async index(req, res) {
    const organizedMeetups = await Meetup.findAll({
      where: { user_id: req.userId },
      attributes: {
        exclude: ['user_id', 'image_id', 'createdAt', 'updatedAt'],
      },
      include: [
        {
          model: File,
          attributes: ['path', 'url'],
        },
      ],
    });

    return res.json(organizedMeetups);
  }
}

export default new OrganizingController();
